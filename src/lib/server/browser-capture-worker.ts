import {validateBrowserEvidence,type BrowserEvidence} from '../browser-evidence';
/** Reuse the configured quality service; no worker address or credentials leave the server. */
export async function captureWithBrowserWorker(source:string):Promise<BrowserEvidence|null>{
 const endpoint=process.env.FORGE_QUALITY_WORKER_URL,secret=process.env.FORGE_QUALITY_WORKER_SECRET;
 if(!endpoint||!secret)return null;
 try{
  const url=new URL(endpoint),target=new URL(source);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/review')return null;
  url.pathname='/capture';
  const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},body:JSON.stringify({url:source})});
  if(!response.ok)return null;
  const reader=response.body?.getReader();if(!reader)return null;
  let raw='';const decoder=new TextDecoder();let bytes=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>300000){await reader.cancel();return null}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
  const result:unknown=JSON.parse(raw);
  if(!validateBrowserEvidence(result)||new URL(result.sourceUrl).origin!==target.origin||!result.pages.some(p=>p.path===target.pathname+target.search))return null;
  // Screenshots are not needed for style reuse and must not leak worker-local URLs.
  return {...result,pages:result.pages.map(({screenshotUrl:_,...page})=>page)};
 }catch{return null}
}
