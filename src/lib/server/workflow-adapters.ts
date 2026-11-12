import {z} from 'zod';
const Layout=z.object({layout:z.enum(['editorial','image-led'])}).strict();
const Brief=z.object({industry:z.string().min(2).max(80),services:z.array(z.string().max(100)).max(12)});
type Options={env?:Record<string,string|undefined>;fetcher?:typeof fetch};
export type DesignAdvice={status:'not-configured'|'unavailable'|'applied';layout?:'editorial'|'image-led'};
function endpoint(value:string|undefined){
 if(!value)throw Error('Not configured');const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Invalid workflow endpoint');
 return url;
}
async function readJson(response:Response){
 if(!response.ok){await response.body?.cancel();throw Error('Workflow unavailable')}
 const reader=response.body?.getReader();if(!reader)throw Error('Empty response');let raw='',size=0;const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();throw Error('Workflow response limit')}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode();return JSON.parse(raw) as Record<string,unknown>}finally{reader.releaseLock()}
}
/** Optional owner knowledge workflow advises layout only; cannot change business facts or supply HTML. */
export async function designAdvice(input:{industry:string;services:string[]},options:Options={}):Promise<DesignAdvice>{
 const env=options.env||process.env,provider=env.FORGE_DESIGN_ADVISOR;
 if(provider!=='dify'&&provider!=='flowise')return {status:'not-configured'};
 try{
  const brief=Brief.parse(input),isDify=provider==='dify';
  const url=endpoint(isDify?env.DIFY_WORKFLOW_URL:env.FLOWISE_PREDICTION_URL);
  const key=isDify?env.DIFY_API_KEY:env.FLOWISE_API_KEY;if(!key)throw Error('Missing key');
  if(isDify?!/\/v1\/workflows\/run$/.test(url.pathname):!/\/api\/v1\/prediction\/[a-zA-Z0-9-]+$/.test(url.pathname))throw Error('Invalid workflow path');
  const body=isDify?{inputs:{industry:brief.industry,services:brief.services.join('; ')},response_mode:'blocking',user:'forge-design-advisor'}:{question:'Using the configured design knowledge, return only JSON {"layout":"editorial"} or {"layout":"image-led"} for this business type: '+JSON.stringify(brief),streaming:false};
  const result=await readJson(await (options.fetcher||fetch)(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(2500),headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(body)}));
  let candidate:unknown;
  if(isDify){const data=result.data as {status?:unknown;outputs?:unknown}|undefined;if(data?.status!=='succeeded')throw Error('Workflow incomplete');candidate=data.outputs}
  else{if(typeof result.text!=='string')throw Error('Missing prediction');candidate=JSON.parse(result.text)}
  return {status:'applied',layout:Layout.parse(candidate).layout};
 }catch{return {status:'unavailable'}}
}
const Event=z.object({id:z.string().uuid(),type:z.enum(['draft.generated','draft.failed']),provider:z.enum(['ollama','cloudflare']).optional(),pageCount:z.number().int().min(1).max(30).optional()}).strict();
/** Best effort, one attempt, status-only payload; no business data, generated HTML or error details. */
export async function notifyGeneration(event:z.infer<typeof Event>,options:Options={}):Promise<'not-configured'|'accepted'|'unavailable'>{
 const env=options.env||process.env;if(!env.ACTIVEPIECES_WEBHOOK_URL)return 'not-configured';
 try{
  const url=endpoint(env.ACTIVEPIECES_WEBHOOK_URL),payload=Event.parse(event);
  const response=await (options.fetcher||fetch)(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(2000),headers:{'Content-Type':'application/json','X-Forge-Event-Id':payload.id,...(env.ACTIVEPIECES_WEBHOOK_TOKEN?{Authorization:'Bearer '+env.ACTIVEPIECES_WEBHOOK_TOKEN}:{})},body:JSON.stringify({version:1,...payload,requiresReview:true})});
  await response.body?.cancel();return response.ok?'accepted':'unavailable';
 }catch{return 'unavailable'}
}
