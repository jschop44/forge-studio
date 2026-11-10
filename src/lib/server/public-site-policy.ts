import robotsParser from 'robots-parser';
import {fetchPublicText,publicSiteUrl,PublicSiteHttpError} from './public-site-fetch';
const AGENT='ForgeStudioSiteResearch/1.0';
/** One extraction request shares cached policies and serializes crawl-delay compliance.
 * Every redirect destination is authorized before its content is requested. */
export function publicResearchPolicy(read:typeof fetchPublicText=fetchPublicText){
 const policies=new Map<string,{rules:ReturnType<typeof robotsParser>;lastRequest:number}>();
 return async(target:URL)=>{
  const url=publicSiteUrl(target.href);let policy=policies.get(url.origin);
  if(!policy){
   const robotsUrl=new URL('/robots.txt',url);let text='';
   try{text=(await read(robotsUrl,{timeout:3000,maxBytes:100000,accept:'text/plain',redirects:2})).body}
   catch(error){if(!(error instanceof PublicSiteHttpError&&error.status===404))throw Error('Website access policy could not be verified; supply authorized source files')}
   if(/<(?:!doctype|html|body)\b/i.test(text))throw Error('Website access policy could not be verified; supply authorized source files');
   policy={rules:robotsParser(robotsUrl.href,text),lastRequest:Date.now()};policies.set(url.origin,policy);
  }
  if(policy.rules.isAllowed(url.href,AGENT)!==true)throw Error('Website policy disallows automated extraction; supply authorized source files');
  const delay=policy.rules.getCrawlDelay(AGENT)||0;
  if(delay>3)throw Error('Website crawl delay exceeds the extraction budget; supply authorized source files');
  const wait=delay*1000-(Date.now()-policy.lastRequest);if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));policy.lastRequest=Date.now();
 };
}
