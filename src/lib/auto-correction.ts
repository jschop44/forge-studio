/** Bounded, dependency-free quality correction loop for generated site pages.
 * Run after generation and before publication. No network access, paid API, or untrusted execution.
 * Browser/Playwright visual evidence can be supplied by a separate worker.
 */
export type PageEvidence={slug:string;html:string;brokenImages?:string[];brokenLinks?:string[];overflowPx?:number};
export type QualityFinding={slug:string;kind:'missing-image'|'broken-image'|'broken-link'|'horizontal-overflow'|'missing-title'|'accessibility';detail:string};
export type CorrectionResult={pages:PageEvidence[];findings:QualityFinding[];attempts:number;passed:boolean};
const localHref=(href:string)=>!href.startsWith('#')&&!/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(href);
const destination=(href:string)=>href.split(/[?#]/)[0].replace(/^\.\//,'').replace(/^\//,'')||'index.html';
export function inspectGeneratedPages(pages:PageEvidence[]):QualityFinding[]{
 const slugs=new Set(pages.map(p=>p.slug.replace(/^\//,'').replace(/\.html$/,'')+'.html'));
 return pages.flatMap(page=>{
  const findings:QualityFinding[]=[];
  if(!/<title(?:\s[^>]*)?>[^<]+<\/title>/i.test(page.html))findings.push({slug:page.slug,kind:'missing-title',detail:'No document title'});
  if(!/<img\b/i.test(page.html))findings.push({slug:page.slug,kind:'missing-image',detail:'Page contains no image'});
  for(const src of page.brokenImages||[])findings.push({slug:page.slug,kind:'broken-image',detail:src});
  for(const href of page.brokenLinks||[])findings.push({slug:page.slug,kind:'broken-link',detail:href});
  for(const match of page.html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)){
   const href=match[1];if(localHref(href)&&!slugs.has(destination(href)))findings.push({slug:page.slug,kind:'broken-link',detail:href});
  }
  if((page.overflowPx||0)>2)findings.push({slug:page.slug,kind:'horizontal-overflow',detail:String(page.overflowPx)});
  return findings;
 });
}
export async function correctGeneratedPages(pages:PageEvidence[],repair:(pages:PageEvidence[],findings:QualityFinding[],attempt:number)=>Promise<PageEvidence[]>,maxAttempts=2):Promise<CorrectionResult>{
 const limit=Math.min(3,Math.max(0,Math.floor(maxAttempts)));
 let current=pages.map(p=>({...p})),findings=inspectGeneratedPages(current),attempts=0;
 while(findings.length&&attempts<limit){
  const next=await repair(current,findings,attempts+1);
  if(next.length!==current.length||next.some((p,i)=>p.slug!==current[i].slug))throw Error('Repair must preserve page identities');
  current=next.map(p=>({...p}));attempts++;findings=inspectGeneratedPages(current);
 }
 return {pages:current,findings,attempts,passed:findings.length===0};
}
