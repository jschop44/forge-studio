import {z} from 'zod';
import type {GeneratedPage} from '../business-site';

const Page=z.object({slug:z.string().min(1).max(64),title:z.string().max(200),html:z.string().min(1).max(250000)});
const Result=z.object({pages:z.array(Page).min(1).max(12),passed:z.boolean(),attempts:z.number().int().min(0).max(2),findings:z.array(z.object({slug:z.string().max(64),kind:z.string().max(80),detail:z.string().max(500)})).max(200)});
export type BrowserReview={status:'passed'|'failed'|'unavailable'|'not-configured';scope:'inert-render';attempts:number;findings:{slug:string;kind:string;detail:string}[]};
/** Server-only boundary: generated sites never receive the worker address or secret. */
export async function reviewWithBrowserWorker(pages:GeneratedPage[]):Promise<{pages:GeneratedPage[];browserReview:BrowserReview}>{
 const endpoint=process.env.FORGE_QUALITY_WORKER_URL,secret=process.env.FORGE_QUALITY_WORKER_SECRET;
 const fallback=(status:BrowserReview['status'])=>({pages,browserReview:{status,scope:'inert-render' as const,attempts:0,findings:[]}});
 if(!endpoint)return fallback('not-configured');
 try{
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||url.username||url.password||url.hash||!secret)throw Error('Invalid quality worker configuration');
  const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},body:JSON.stringify({pages})});
  if(!response.ok)throw Error('Quality worker unavailable');
  const raw=await response.text();if(raw.length>1500000)throw Error('Quality result too large');
  const result=Result.parse(JSON.parse(raw));
  if(result.pages.length!==pages.length||result.pages.some((page,i)=>page.slug!==pages[i].slug||page.title!==pages[i].title))throw Error('Quality worker changed page identities');
  // The isolated quality graph may repair title metadata only. Never accept rewritten
  // page content, links, scripts, styling or assets from an optional worker.
  const withoutTitles=(html:string)=>html.replace(/<title\\b[^>]*>[\\s\\S]*?<\\/title>/gi,'');
  const titleMarkup=(title:string)=>'<title>'+title.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))+'</title>';
  for(let i=0;i<pages.length;i++){
   const before=pages[i].html,after=result.pages[i].html;
   if(after===before)continue;
   if(withoutTitles(after)!==withoutTitles(before))throw Error('Worker changed page content');
   if(!after.includes(titleMarkup(pages[i].title)))throw Error('Worker supplied invalid title repair');
  }
  if(result.passed&&result.findings.length)throw Error('Inconsistent quality result');
  return {pages:result.pages,browserReview:{scope:'inert-render' as const,status:result.passed?'passed' as const:'failed' as const,attempts:result.attempts,findings:result.findings}};
 }catch{return fallback('unavailable')}
}
