#!/usr/bin/env node
/** Validate that the images advertised by a deployed generated site are real,
 * reachable image resources, not merely <img> markup with dead CDN URLs.
 * Samples ALL distinct external photo identities from the supplied smoke payloads.
 * No arbitrary user URL can be fetched: permit only the image CDNs vetted by Forge.
 */
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const allowedHosts=new Set(['images.unsplash.com','upload.wikimedia.org','images.pexels.com','live.staticflickr.com','cdn.stocksnap.io','cdn.pixabay.com']);
const decodeHtmlUrl=value=>value.replace(/&amp;/gi,'&').replace(/&#38;/g,'&').replace(/&#x26;/gi,'&');
export function collectPhotoUrls(payloads){
 const found=new Map();
 for(const payload of payloads){
  const pages=payload?.pages;
  if(!Array.isArray(pages)||pages.length===0)throw Error('No generated pages found in smoke response');
  for(const page of pages){
   const html=page?.html;
   if(typeof html!=='string')throw Error('Missing generated page HTML');
   for(const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)){
    let url;
    try{url=new URL(decodeHtmlUrl(match[1]))}catch{continue}
    if(url.protocol!=='https:'||!allowedHosts.has(url.hostname))continue;
    const identity=url.origin+url.pathname;
    if(!found.has(identity))found.set(identity,url.toString());
   }
  }
 }
 return [...found.values()];
}
export async function checkPhotoUrl(url,fetcher=fetch){
 let last='';
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetcher(url,{method:'HEAD',signal:AbortSignal.timeout(12000),redirect:'follow'});
   const type=response.headers.get('content-type')||'';
   if(response.ok&&/^image\/(?:jpeg|png|webp|avif|gif)(?:;|$)/i.test(type))return {url,ok:true,status:response.status,type};
   // Some media CDNs reject HEAD, but accept a one-byte range GET.
   if(response.status===405){
    const fallback=await fetcher(url,{method:'GET',headers:{Range:'bytes=0-0'},signal:AbortSignal.timeout(12000),redirect:'follow'});
    const fallbackType=fallback.headers.get('content-type')||'';
    if(fallback.ok&&/^image\/(?:jpeg|png|webp|avif|gif)(?:;|$)/i.test(fallbackType)){
     await fallback.body?.cancel();return {url,ok:true,status:fallback.status,type:fallbackType};
    }
    await fallback.body?.cancel();
   }
   last='HTTP '+response.status+' ('+type+')';await response.body?.cancel();
  }catch(error){last=error instanceof Error?error.message:String(error)}
 }
 return {url,ok:false,reason:last};
}
export async function verifyGeneratedPhotoDelivery(payloads,fetcher=fetch){
 const urls=collectPhotoUrls(payloads);
 if(urls.length<5)throw Error('Too few unique photo sources to establish delivery');
 const results=[];
 for(let offset=0;offset<urls.length;offset+=4)results.push(...await Promise.all(urls.slice(offset,offset+4).map(url=>checkPhotoUrl(url,fetcher))));
 const failed=results.filter(x=>!x.ok);
 return {checked:urls.length,passed:results.length-failed.length,failed};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  if(process.argv.length<4)throw Error('Usage: node scripts/verify-generated-photo-delivery.mjs coffee.json fruit.json');
  const payloads=await Promise.all(process.argv.slice(2).map(async file=>JSON.parse(await readFile(file,'utf8'))));
  const result=await verifyGeneratedPhotoDelivery(payloads);
  console.log('Photo CDN delivery: '+result.passed+'/'+result.checked+' unique image resources returned successful image responses');
  if(result.failed.length){
   for(const problem of result.failed)console.error('Photo failed: '+problem.url+' — '+problem.reason);
   process.exitCode=1;
  }
 }catch(error){console.error('Photo delivery validation failed:',error instanceof Error?error.message:String(error));process.exitCode=1}
}
