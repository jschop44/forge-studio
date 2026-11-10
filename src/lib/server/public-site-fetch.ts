import {lookup,resolve4,resolve6} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {isIP} from 'node:net';
import {isPublicAddress} from '../../../workers/public-network-policy.mjs';

export class PublicSiteHttpError extends Error{readonly status:number;constructor(status:number){super('Website returned status '+status);this.status=status}}

type Address={address:string;family:number};
type Options={timeout:number;maxBytes:number;accept:string;redirects?:number;selectiveHtml?:boolean;maxDownloadBytes?:number;beforeRequest?:(url:URL)=>Promise<void>};
type Dependencies={worker?:boolean;fetcher?:typeof fetch;resolveHost?:(host:string)=>Promise<Address[]>};
export function publicSiteUrl(value:string,base?:URL):URL{
 const url=new URL(base?value:/^https?:\/\//i.test(value)?value:'https://'+value,base);
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!url.hostname.includes('.')||isIP(url.hostname)||url.hostname.endsWith('.local'))throw Error('Enter a public HTTPS website address');
 return url;
}
export function isWorkerNetwork(){return typeof (globalThis as unknown as {WebSocketPair?:unknown}).WebSocketPair==='function'}
async function publicAddresses(hostname:string,worker:boolean):Promise<Address[]>{
 if(!worker)return lookup(hostname,{all:true,verbatim:true});
 // Workers supports explicit DNS resolution; its Node OS lookup/socket override does not.
 const optional=async(work:()=>Promise<string[]>)=>{try{return await work()}catch(error){const code=(error as {code?:string})?.code;if(['ENODATA','ENOTFOUND'].includes(code||''))return [];throw error}};
 const [v4,v6]=await Promise.all([optional(()=>resolve4(hostname)),optional(()=>resolve6(hostname))]);
 return [...v4.map(address=>({address,family:4})),...v6.map(address=>({address,family:6}))];
}
function assertAddresses(addresses:Address[]){if(!addresses.length||addresses.some(item=>!isPublicAddress(item.address)))throw Error('Website address is not public')}
type BodyResult={body:string;truncated:boolean;downloadedBytes:number;scriptsOmitted:number};
/** Incremental research collector: scripts/comments never occupy the retained HTML budget.
 * Limits are separate: bytes received bound network work, bytes retained bound parsing/context.
 * This is metadata extraction, not a sanitizer or executable HTML reconstruction. */
export class PublicTextCollector{
 private decoder=new TextDecoder();private pending='';private output='';private retained=0;private omitted=0;private state:'html'|'script'|'comment'='html';
 downloadedBytes=0;truncated=false;stopped=false;
 private options:Pick<Options,'maxBytes'|'selectiveHtml'|'maxDownloadBytes'>;
 constructor(options:Pick<Options,'maxBytes'|'selectiveHtml'|'maxDownloadBytes'>){this.options=options}
 private append(text:string){
  const remaining=this.options.maxBytes-this.retained;if(!text)return;if(remaining<=0){this.truncated=true;this.stopped=true;return}
  const bytes=new TextEncoder().encode(text);
  if(bytes.length>remaining){this.output+=new TextDecoder().decode(bytes.subarray(0,remaining)).replace(/\ufffd$/,'');this.retained=this.options.maxBytes;this.truncated=true;this.stopped=true}
  else{this.output+=text;this.retained+=bytes.length}
 }
 push(chunk:Uint8Array){
  if(this.stopped)return;
  const wireLimit=this.options.selectiveHtml?(this.options.maxDownloadBytes??Math.min(8000000,this.options.maxBytes*16)):this.options.maxBytes;
  const remaining=wireLimit-this.downloadedBytes;this.downloadedBytes+=Math.min(chunk.byteLength,remaining);
  if(chunk.byteLength>remaining&&!this.options.selectiveHtml)throw Error('Website response is too large');
  const text=this.decoder.decode(chunk.subarray(0,remaining),{stream:true});
  if(this.options.selectiveHtml){this.pending+=text;this.consume(false)}else this.append(text);
  if(chunk.byteLength>remaining){this.truncated=true;this.stopped=true}
 }
 private consume(final:boolean){
  while(this.pending&&!this.stopped){
   if(this.state!=='html'){
    const match=this.state==='script'?/<\/script\s*>/i.exec(this.pending):/-->/.exec(this.pending);
    if(match){this.pending=this.pending.slice(match.index+match[0].length);this.state='html';continue}
    // Closing delimiters may straddle network chunks; discarded payload stays bounded.
    this.pending=final?'':this.pending.slice(-32);return;
   }
   const start=this.pending.indexOf('<');
   if(start<0){this.append(this.pending);this.pending='';return}
   if(start){this.append(this.pending.slice(0,start));this.pending=this.pending.slice(start);if(this.stopped)return}
   if(this.pending.startsWith('<!--')){this.pending=this.pending.slice(4);this.state='comment';continue}
   const end=this.pending.indexOf('>');
   if(end<0){if(final){this.append(this.pending);this.pending=''}else if(this.pending.length>16384){this.truncated=true;this.stopped=true}return}
   const tag=this.pending.slice(0,end+1);this.pending=this.pending.slice(end+1);
   if(/^<script(?:\s|>)/i.test(tag)){this.state='script';this.omitted++}else this.append(tag);
  }
 }
 finish():BodyResult{
  if(!this.stopped){const tail=this.decoder.decode();if(this.options.selectiveHtml){this.pending+=tail;this.consume(true)}else this.append(tail)}
  return {body:this.output,truncated:this.truncated,downloadedBytes:this.downloadedBytes,scriptsOmitted:this.omitted};
 }
}
async function boundedBody(response:Response,options:Options):Promise<BodyResult>{
 const collector=new PublicTextCollector(options);if(!response.body)return collector.finish();
 const reader=response.body.getReader();
 try{while(true){const {done,value}=await reader.read();if(done)break;collector.push(value);if(collector.stopped){await reader.cancel();break}}}catch(error){await reader.cancel().catch(()=>{});throw error}finally{reader.releaseLock()}
 return collector.finish();
}
async function nodeResource(url:URL,addresses:Address[],options:Options):Promise<{status:number;location:string|null;contentType:string;body:string;extraction?:BodyResult}>{
 const pinned=addresses.find(item=>item.family===4)||addresses[0];
 return new Promise((resolve,reject)=>{
  const request=httpsRequest(url,{method:'GET',timeout:options.timeout,signal:AbortSignal.timeout(options.timeout),headers:{'User-Agent':'ForgeStudioSiteResearch/1.0',Accept:options.accept,'Accept-Encoding':'identity'},lookup:(_hostname,lookupOptions,callback)=>{
   if(typeof lookupOptions==='object'&&lookupOptions.all)callback(null,[pinned]);else (callback as (error:null,address:string,family:number)=>void)(null,pinned.address,pinned.family);
  }},response=>{
   const status=response.statusCode||0,location=typeof response.headers.location==='string'?response.headers.location:null;
   if(status>=300&&status<400){response.resume();resolve({status,location,contentType:'',body:''});return}
   if(status!==200){response.resume();resolve({status,location:null,contentType:'',body:''});return}
   const collector=new PublicTextCollector(options);let settled=false;
   const complete=()=>{if(settled)return;settled=true;const extraction=collector.finish();resolve({status,location:null,contentType:String(response.headers['content-type']||''),body:extraction.body,extraction})};
   response.on('data',(chunk:Buffer)=>{try{collector.push(chunk);if(collector.stopped){complete();response.destroy()}}catch(error){request.destroy(error as Error)}});
   response.on('end',complete);response.on('error',reject);
  });
  request.on('timeout',()=>request.destroy(Error('Website timed out')));request.on('error',reject);request.end();
 });
}
/** Public read-only requests. Keep Node DNS pinning and use the Worker's public-network Fetch API.
 * Never pass incoming cookies, credentials, private service bindings, or automatic redirects.
 */
export async function fetchPublicText(input:URL,options:Options,dependencies:Dependencies={}):Promise<{url:URL;body:string;extraction?:BodyResult}>{
 const worker=dependencies.worker??isWorkerNetwork();let url=publicSiteUrl(input.href);
 for(let attempt=0;attempt<=(options.redirects??0);attempt++){
  if(options.beforeRequest)await options.beforeRequest(url);
  const addresses=await (dependencies.resolveHost?dependencies.resolveHost(url.hostname):publicAddresses(url.hostname,worker));assertAddresses(addresses);
  let result:{status:number;location:string|null;contentType:string;body:string;extraction?:BodyResult};
  if(worker){
   const response=await (dependencies.fetcher||fetch)(url,{method:'GET',redirect:'manual',headers:{'User-Agent':'ForgeStudioSiteResearch/1.0',Accept:options.accept},signal:AbortSignal.timeout(options.timeout),cache:'no-store'});
   const status=response.status;
   if(status>=300&&status<400){const location=response.headers.get('location');await response.body?.cancel();result={status,location,contentType:'',body:''}}
   else if(status!==200){await response.body?.cancel();result={status,location:null,contentType:'',body:''}}
   else {const extraction=await boundedBody(response,options);result={status,location:null,contentType:response.headers.get('content-type')||'',body:extraction.body,extraction}};
  }else result=await nodeResource(url,addresses,options);
  if(result.status>=300&&result.status<400){if(!result.location||attempt===(options.redirects??0))throw Error('Website redirect could not be followed');url=publicSiteUrl(result.location,url);continue}
  if(result.status!==200)throw new PublicSiteHttpError(result.status);
  if(options.accept==='text/html'&&!result.contentType.toLowerCase().includes('text/html'))throw Error('Website did not return HTML');
  return {url,body:result.body,extraction:result.extraction??{body:result.body,truncated:false,downloadedBytes:0,scriptsOmitted:0}};
 }
 throw Error('Website redirect limit reached');
}
