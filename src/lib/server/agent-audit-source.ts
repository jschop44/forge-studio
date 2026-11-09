import {recognizeBusinessWithLocalAi} from './local-ai';
import robotsParser from 'robots-parser';
import {fetchPublicText,publicSiteUrl,PublicSiteHttpError} from './public-site-fetch';
import type {AgentTask} from '../agents/types';
function transient(error:unknown){return error instanceof PublicSiteHttpError?[429,500,502,503,504].includes(error.status):error instanceof Error&&(['AbortError','TimeoutError'].includes(error.name)||/timed out/i.test(error.message)||['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN'].includes(String((error as NodeJS.ErrnoException).code)))}
const AGENT='ForgeStudioSiteResearch/1.0';
let active=0;
export class AuditSourceError extends Error{readonly retryable:boolean;constructor(message:string,retryable=false){super(message);this.retryable=retryable}}

/** One permitted public page. Never sends credentials or bypasses robots; rechecks every redirect destination. */
export async function collectAgentAuditSource(website:string,read:typeof fetchPublicText=fetchPublicText){
 const url=publicSiteUrl(website);
 if(active>=2)throw new AuditSourceError('Website research capacity reached',true);
 active++;
 try{
  const policies=new Map<string,{policy:ReturnType<typeof robotsParser>;lastRequest:number}>();
  const allow=async(target:URL)=>{
   const checked=publicSiteUrl(target.href);let cached=policies.get(checked.origin);
   if(!cached){
    const robotsUrl=new URL('/robots.txt',checked);let rules='';
    try{rules=(await read(robotsUrl,{timeout:3000,maxBytes:100000,accept:'text/plain',redirects:2})).body}
    catch(error){if(!(error instanceof PublicSiteHttpError&&error.status===404))throw new AuditSourceError('Website access policy could not be verified',transient(error))}
    if(/<(?:!doctype|html|body)\b/i.test(rules))throw new AuditSourceError('Website access policy could not be verified');
    cached={policy:robotsParser(robotsUrl.href,rules),lastRequest:Date.now()};policies.set(checked.origin,cached);
   }
   if(cached.policy.isAllowed(checked.href,AGENT)!==true)throw new AuditSourceError('Website policy disallows automated research; supply permitted HTML');
   const delay=cached.policy.getCrawlDelay(AGENT)||0;
   if(delay>3)throw new AuditSourceError('Website crawl delay exceeds the research budget; supply permitted HTML');
   const wait=delay*1000-(Date.now()-cached.lastRequest);if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));
   cached.lastRequest=Date.now();
  };
  await allow(url);let initial=true;
  let page;try{page=await read(url,{timeout:7000,maxBytes:250000,accept:'text/html',redirects:2,beforeRequest:async target=>{if(initial&&target.href===url.href){initial=false;return}initial=false;await allow(target)}})}catch(error){if(error instanceof AuditSourceError)throw error;throw new AuditSourceError('Website page could not be retrieved safely; supply permitted HTML or retry later',transient(error))}
  if(!page.body.trim())throw new AuditSourceError('Website returned no usable HTML');
  return {html:page.body,website:page.url.href,observedAt:new Date().toISOString()};
 }finally{active--}
}

type Recognizer=(input:{businessName:string;brief:string})=>Promise<{status:string;industry:string;services:string[];provider?:string}>;
function plain(text:string){return text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
export async function prepareAgentAudit(task:AgentTask,collect=collectAgentAuditSource,recognize:Recognizer=recognizeBusinessWithLocalAi):Promise<AgentTask>{
 if(task.kind!=='website-audit'||typeof task.payload.website!=='string')return task;
 const supplied=typeof task.payload.html==='string'&&task.payload.html.trim();
 const evidence=supplied?{html:String(task.payload.html),website:task.payload.website}:await collect(task.payload.website);
 const payload:Record<string,unknown>={...task.payload,html:evidence.html,website:evidence.website,...(!supplied?{sourceObservation:{url:evidence.website,observedAt:'observedAt' in evidence?evidence.observedAt:undefined,scope:'permitted public homepage'}}:{})};
 const hasIndustry=typeof payload.industry==='string'&&payload.industry.trim().length>=2;
 const hasServices=Array.isArray(payload.services)&&payload.services.length>0;
 const title=plain(evidence.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const headings=[...evidence.html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)].slice(0,8).map(match=>plain(match[1]));
 const descriptions=[...evidence.html.matchAll(/<meta\b[^>]*>/gi)].map(match=>match[0]).filter(tag=>/name=['"]description['"]|property=['"]og:description['"]/i.test(tag)).map(tag=>plain(tag.match(/content=['"]([^'"]*)['"]/i)?.[1]||''));
 const sourceBrief=[title,...descriptions,...headings].filter(Boolean).join(' • ').slice(0,1800);
 if(!payload.summary&&sourceBrief.length>=15)payload.summary=sourceBrief;
 if(!hasIndustry||!hasServices){
  let recognized;try{recognized=await recognize({businessName:String(payload.businessName||title).slice(0,100),brief:sourceBrief||String(payload.summary||'').slice(0,1800)})}catch{throw new AuditSourceError('Business recognition temporarily unavailable',true)}
  if(recognized.status!=='identified'||!hasServices&&!recognized.services.length)throw new AuditSourceError('Business type and services need owner confirmation before planning');
  if(!hasIndustry)payload.industry=recognized.industry;
  if(!hasServices)payload.services=recognized.services;
 }
 return {...task,payload};
}
