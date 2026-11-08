import {pathToFileURL} from 'node:url';
const origin='https://forge-studio-preview.stands-old-3h.workers.dev';
const allowedCategories=new Set(['provider_rate_limited','provider_auth','provider_server_error','invalid_model_response','provider_timeout','provider_unavailable','provider_failure']);
// Only report a bounded allowlist from the exact synthetic request. Never expose raw events.
export function summarizeDiagnostic(event,requestUrl){
 if(event?.event?.request?.url!==requestUrl)return null;
 const categories=[];
 for(const log of event.logs||[]){
  const message=log.message;
  if(!Array.isArray(message))continue;
  if(message[0]==='Forge AI generation failure category:'&&allowedCategories.has(message[1]))categories.push({category:message[1]});
  if(message[0]!=='Workers AI inference failed')continue;
  try{
   const item=typeof message[1]==='string'?JSON.parse(message[1]):message[1];
   categories.push({code:/^\d{1,8}$/.test(String(item?.code))?String(item.code):'unknown',category:allowedCategories.has(item?.category)?item.category:'unknown'});
  }catch{/* Malformed or private provider text is never forwarded. */}
 }
 return {providerDiagnostics:categories,exceptionCount:Array.isArray(event.exceptions)?event.exceptions.length:0,rawEventsDisclosed:false};
}
export async function diagnosePreviewAi(){
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
 if(!account||!token)throw Error('Cloudflare diagnostic credentials are missing');
 const endpoint=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/workers/scripts/forge-studio-preview/tails`;
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 let record,socket;
 try{
  const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({filters:[{sampling_rate:1}]}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Diagnostic subscription creation failed (HTTP '+response.status+')');
  const payload=await response.json();record=payload.result;
  if(!payload.success||typeof record?.id!=='string'||typeof record?.url!=='string'||new URL(record.url).protocol!=='wss:')throw Error('Diagnostic subscription was rejected');
  socket=new WebSocket(record.url,'trace-v1');
  const requestUrl=origin+'/api/ai/business?diagnostic='+crypto.randomUUID();
  let finish;
  const eventResult=new Promise(resolve=>{finish=resolve});
  socket.addEventListener('message',async event=>{
   try{
    const data=typeof event.data==='string'?event.data:await event.data.text();
    if(data.length>1000000)return;
    const summary=summarizeDiagnostic(JSON.parse(data),requestUrl);
    if(summary)finish(summary);
   }catch{/* Do not disclose websocket payloads. */}
  });
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Diagnostic subscription timed out')),15000);
   socket.addEventListener('open',()=>{clearTimeout(timer);socket.send(JSON.stringify({debug:false}));resolve()},{once:true});
   socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Diagnostic subscription connection failed'))},{once:true});
  });
  const generation=await fetch(requestUrl,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({businessName:'Forge Diagnostic Studio',industry:'Design',description:'An independent studio designing accessible websites for local businesses.',services:['Website design']}),signal:AbortSignal.timeout(90000)});
  console.log(JSON.stringify({syntheticRequestStatus:generation.status}));
  let timer;
  const summary=await Promise.race([eventResult,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),15000)})]);
  clearTimeout(timer);
  if(!summary)throw Error('No correlated diagnostic event captured');
  console.log(JSON.stringify(summary));
  if(!generation.ok&&!summary.providerDiagnostics.length)throw Error('Provider failure remains unclassified');
 }finally{
  socket?.close();
  if(record?.id)await fetch(endpoint+'/'+encodeURIComponent(record.id),{method:'DELETE',headers,signal:AbortSignal.timeout(10000)}).catch(()=>{});
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 // A remote websocket can retain the Node event loop after close(). Cleanup above
 // deletes the provider subscription; explicitly finish this bounded CLI process.
 diagnosePreviewAi().then(()=>process.stdout.write('',()=>process.exit(0))).catch(error=>{
  const message=error instanceof Error?error.message:'';
  const safe=/^(Cloudflare diagnostic credentials are missing|Diagnostic subscription (creation failed \(HTTP \d{3}\)|was rejected|timed out|connection failed)|No correlated diagnostic event captured|Provider failure remains unclassified)$/.test(message)?message:'Diagnostic network or response failure';
  process.stderr.write(safe+'; no private provider output disclosed\n',()=>process.exit(1));
 });
}
