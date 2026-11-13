/** Optional self-hosted Node service. Browsers never run in Cloudflare Workers. */
import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {chromium} from '@playwright/test';
import {Annotation,StateGraph,START,END} from '@langchain/langgraph';
import {z} from 'zod';
import axe from 'axe-core';
import {captureWithCrawlee} from './capture';
import {generateComfyVisual} from './visual-generation';
import {auditForgePerformance} from './performance-audit';
import {pathToFileURL} from 'node:url';
import {qualityWorkerBindHost} from './bind-host';
import {collectBrowserQualityEvidence} from '../../src/lib/browser-quality-evidence';
import {applyMobileHeadingRepair} from '../../src/lib/heading-overflow-repair';
import {inspectGeneratedPages,type PageEvidence,type QualityFinding} from '../../src/lib/auto-correction';

async function bounded<T>(operation:Promise<T>,ms:number):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Inspection timed out')),ms)})])}finally{clearTimeout(timer)}
}
const Input=z.object({pages:z.array(z.object({slug:z.string().regex(/^[a-z0-9-]+$/).max(64),title:z.string().min(1).max(200),html:z.string().min(1).max(250000)})).min(1).max(12)});
type SitePage=PageEvidence&{title:string};
const State=Annotation.Root({pages:Annotation<SitePage[]>(),findings:Annotation<QualityFinding[]>(),attempts:Annotation<number>()});
export const qualityGraph=new StateGraph(State)
 .addNode('inspect',async state=>{
  const browser=await chromium.launch({headless:true,timeout:10000});
  const started=Date.now();const accessibility:QualityFinding[]=[];
  try{
   const pages:SitePage[]=[];
   for(const page of state.pages){
    if(Date.now()-started>30000)throw Error('Inspection time budget exceeded');
    // Render inert markup: no scripts, network, service workers or credentials.
    // External photo reachability is deliberately not asserted in this isolated worker.
    const context=await browser.newContext({javaScriptEnabled:true,serviceWorkers:'block'});
    await context.route('**/*',route=>route.abort());
    try{
     const tab=await context.newPage();
     const observed={brokenImages:[] as string[],brokenLinks:[] as string[],clippedHeadings:[] as string[],overflowPx:0};
     for(const width of [1280,390]){
      await tab.setViewportSize({width,height:900});
      await tab.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="script-src &#39;none&#39;; object-src &#39;none&#39;; frame-src &#39;none&#39;; connect-src &#39;none&#39;">'+page.html,{waitUntil:'domcontentloaded',timeout:4000});
      const evidence=await tab.evaluate(collectBrowserQualityEvidence);
      await tab.evaluate(source=>(0,eval)(source),axe.source);
      const violations=await bounded(tab.evaluate(async()=>{const result=await (window as unknown as {axe:{run:(root:Document,options:unknown)=>Promise<{violations:{id:string;impact:string|null}[]}>}}).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return result.violations.filter(v=>v.impact==='critical'||v.impact==='serious').map(v=>v.id)}),5000);
      accessibility.push(...violations.map(id=>({slug:page.slug,kind:'accessibility' as const,detail:id+' at '+width+'px'})));
      // Network requests are blocked; only embedded images can be tested here.
      observed.brokenImages.push(...evidence.brokenImages.filter(src=>src.startsWith('data:')));
      observed.brokenLinks.push(...evidence.brokenLinks);
      observed.clippedHeadings.push(...evidence.clippedHeadings.map(detail=>detail+' at '+width+'px'));
      observed.overflowPx=Math.max(observed.overflowPx,evidence.overflowPx);
     }
     pages.push({...page,...observed,brokenLinks:[...new Set(observed.brokenLinks)],clippedHeadings:[...new Set(observed.clippedHeadings)].slice(0,20)});
    }finally{await context.close()}
   }
   return {pages,findings:[...inspectGeneratedPages(pages),...accessibility]};
  }finally{await browser.close()}
 })
 .addNode('repair',state=>({attempts:state.attempts+1,pages:state.pages.map(page=>{
  let html=page.html;
  // A single fixed CSS correction is allowed only after the actual phone
  // browser reported a clipped headline. Re-inspect; never invent a layout.
  const hasBroaderDefect=state.findings.some(f=>f.slug===page.slug&&['broken-image','missing-image','broken-link','horizontal-overflow','accessibility'].includes(f.kind));
  const phoneClipped=!hasBroaderDefect&&state.findings.some(f=>f.slug===page.slug&&f.kind==='clipped-heading'&&f.detail.includes('390px'));
  if(phoneClipped)html=applyMobileHeadingRepair(html);
  // Preserve branding, links, business copy and interaction scripts.
  if(state.findings.some(f=>f.slug===page.slug&&f.kind==='missing-title')){
   const title=page.title.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
   html=/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)?html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i,'<title>'+title+'</title>'):html.replace(/<head\b[^>]*>/i,head=>head+'<title>'+title+'</title>');
  }
  return {...page,html};
 })}))
 .addEdge(START,'inspect')
 .addConditionalEdges('inspect',s=>{
  if(s.attempts>=2)return END;
  const missingTitle=s.findings.some(f=>f.kind==='missing-title');
  const fixablePhoneHeading=s.findings.some(f=>f.kind==='clipped-heading'&&f.detail.includes('390px')
   &&s.pages.some(p=>p.slug===f.slug&&!p.html.includes('id="forge-mobile-heading-repair"'))
   &&!s.findings.some(other=>other.slug===f.slug&&['broken-image','missing-image','broken-link','horizontal-overflow','accessibility'].includes(other.kind)));
  return missingTitle||fixablePhoneHeading?'repair':END;
 })
 .addEdge('repair','inspect').compile();
export function startQualityServer(){
let active=false;
const secret=process.env.FORGE_QUALITY_WORKER_SECRET;
if(!secret||secret.length<32)throw Error('Set FORGE_QUALITY_WORKER_SECRET to at least 32 characters');
createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'&&req.url==='/health'){res.writeHead(200).end('{"ok":true}');return}
 const token=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+secret);
 if(req.method!=='POST'||!['/review','/capture','/visual','/performance'].includes(req.url||'')||token.length!==expected.length||!timingSafeEqual(token,expected)){res.writeHead(403).end('{"error":"Forbidden"}');return}
 if(active){res.writeHead(429).end('{"error":"Worker busy"}');return}
 active=true;
 try{
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1100000)throw Error('Payload too large')}
  const payload:unknown=JSON.parse(raw);
  if(req.url==='/capture'){
   const input=z.object({url:z.string().url().max(2048)}).strict().parse(payload);
   const hosts=(process.env.FORGE_CAPTURE_HOSTS||'').split(',').map(h=>h.trim()).filter(Boolean);
   res.end(JSON.stringify(await captureWithCrawlee(input.url,hosts)));return;
  }
  if(req.url==='/visual'){
   const input=z.object({businessName:z.string().min(1).max(100),industry:z.string().min(1).max(80),description:z.string().max(600),services:z.array(z.string().max(120)).max(8)}).strict().parse(payload);
   res.end(JSON.stringify(await generateComfyVisual(input)));return;
  }
  if(req.url==='/performance'){
   const input=z.object({path:z.string().max(200)}).strict().parse(payload);
   res.end(JSON.stringify(await auditForgePerformance(input.path)));return;
  }
  const input=Input.parse(payload);
  if(new Set(input.pages.map(p=>p.slug)).size!==input.pages.length)throw Error('Duplicate pages');
  const result=await qualityGraph.invoke({pages:input.pages,findings:[],attempts:0},{recursionLimit:8});
  res.end(JSON.stringify({pages:result.pages.map(({slug,title,html})=>({slug,title,html})),passed:result.findings.length===0,attempts:result.attempts,findings:result.findings.slice(0,200)}));
 }catch{res.writeHead(422).end('{"error":"Inspection failed"}')}
 finally{active=false}
}).listen(Number(process.env.PORT||8788),qualityWorkerBindHost(process.env.FORGE_QUALITY_BIND_HOST));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startQualityServer();
