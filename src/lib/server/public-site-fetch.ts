import {lookup,resolve4,resolve6} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {isIP} from 'node:net';
import {isPublicAddress} from '../../../workers/public-network-policy.mjs';

type Address={address:string;family:number};
type Options={timeout:number;maxBytes:number;accept:string;redirects?:number};
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
async function boundedBody(response:Response,maxBytes:number){
 if(!response.body)return '';
 const reader=response.body.getReader();const parts:Uint8Array[]=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)throw Error('Website response is too large');parts.push(value)}}catch(error){await reader.cancel().catch(()=>{});throw error}finally{reader.releaseLock()}
 const merged=new Uint8Array(bytes);let offset=0;for(const part of parts){merged.set(part,offset);offset+=part.byteLength}return new TextDecoder().decode(merged);
}
async function nodeResource(url:URL,addresses:Address[],options:Options):Promise<{status:number;location:string|null;contentType:string;body:string}>{
 const pinned=addresses.find(item=>item.family===4)||addresses[0];
 return new Promise((resolve,reject)=>{
  const request=httpsRequest(url,{method:'GET',timeout:options.timeout,headers:{'User-Agent':'ForgeStudioSiteResearch/1.0',Accept:options.accept,'Accept-Encoding':'identity'},lookup:(_hostname,lookupOptions,callback)=>{
   if(typeof lookupOptions==='object'&&lookupOptions.all)callback(null,[pinned]);else (callback as (error:null,address:string,family:number)=>void)(null,pinned.address,pinned.family);
  }},response=>{
   const status=response.statusCode||0,location=typeof response.headers.location==='string'?response.headers.location:null;
   if(status>=300&&status<400){response.resume();resolve({status,location,contentType:'',body:''});return}
   if(status!==200){response.resume();resolve({status,location:null,contentType:'',body:''});return}
   let size=0;const chunks:Buffer[]=[];response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>options.maxBytes){request.destroy(Error('Website response is too large'));return}chunks.push(chunk)});
   response.on('end',()=>resolve({status,location:null,contentType:String(response.headers['content-type']||''),body:Buffer.concat(chunks).toString('utf8')}));response.on('error',reject);
  });
  request.on('timeout',()=>request.destroy(Error('Website timed out')));request.on('error',reject);request.end();
 });
}
/** Public read-only requests. Keep Node DNS pinning and use the Worker's public-network Fetch API.
 * Never pass incoming cookies, credentials, private service bindings, or automatic redirects.
 */
export async function fetchPublicText(input:URL,options:Options,dependencies:Dependencies={}){
 const worker=dependencies.worker??isWorkerNetwork();let url=publicSiteUrl(input.href);
 for(let attempt=0;attempt<=(options.redirects??0);attempt++){
  const addresses=await (dependencies.resolveHost?dependencies.resolveHost(url.hostname):publicAddresses(url.hostname,worker));assertAddresses(addresses);
  let result:{status:number;location:string|null;contentType:string;body:string};
  if(worker){
   const response=await (dependencies.fetcher||fetch)(url,{method:'GET',redirect:'manual',headers:{'User-Agent':'ForgeStudioSiteResearch/1.0',Accept:options.accept},signal:AbortSignal.timeout(options.timeout),cache:'no-store'});
   const status=response.status;
   if(status>=300&&status<400){const location=response.headers.get('location');await response.body?.cancel();result={status,location,contentType:'',body:''}}
   else if(status!==200){await response.body?.cancel();result={status,location:null,contentType:'',body:''}}
   else result={status,location:null,contentType:response.headers.get('content-type')||'',body:await boundedBody(response,options.maxBytes)};
  }else result=await nodeResource(url,addresses,options);
  if(result.status>=300&&result.status<400){if(!result.location||attempt===(options.redirects??0))throw Error('Website redirect could not be followed');url=publicSiteUrl(result.location,url);continue}
  if(result.status!==200)throw Error('Website returned status '+result.status);
  if(options.accept==='text/html'&&!result.contentType.toLowerCase().includes('text/html'))throw Error('Website did not return HTML');
  return {url,body:result.body};
 }
 throw Error('Website redirect limit reached');
}
