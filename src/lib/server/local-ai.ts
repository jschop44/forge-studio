import {z} from 'zod';
import {generateBusinessWebsite} from '../business-site';
const DraftSchema=z.object({businessName:z.string().min(2).max(100),industry:z.string().min(2).max(80),description:z.string().min(15).max(1800),services:z.array(z.string().min(2).max(100)).min(1).max(12)});
export type AiDraft=z.infer<typeof DraftSchema>;
export type AiGenerationResult={draft:AiDraft;provider:'ollama';pages:ReturnType<typeof generateBusinessWebsite>['pages']};
function ollamaConfig(){
 const key=process.env.OLLAMA_API_KEY?.trim();
 if(key)return {url:new URL('https://ollama.com'),model:process.env.OLLAMA_MODEL||'gemma4:31b',headers:{Authorization:'Bearer '+key}};
 const url=new URL(process.env.OLLAMA_URL||'http://127.0.0.1:11434');
 if(!['localhost','127.0.0.1','::1'].includes(url.hostname)||!['http:','https:'].includes(url.protocol))throw Error('OLLAMA_URL must be a loopback endpoint');
 return {url,model:process.env.OLLAMA_MODEL||'llama3.2:3b',headers:{} as Record<string,string>};
}
export async function checkLocalAiReadiness():Promise<{ready:boolean;reason:'ready'|'unreachable'|'model_missing'|'invalid_endpoint'}>{
 let url:URL;
 try{
  url=ollamaConfig().url;
 }catch{return {ready:false,reason:'invalid_endpoint'}}
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),3000);
 try{
  const response=await fetch(new URL('/api/tags',url),{signal:controller.signal,cache:'no-store',headers:ollamaConfig().headers});
  if(!response.ok)return {ready:false,reason:'unreachable'};
  const payload:unknown=await response.json();
  const models=(payload&&typeof payload==='object'&&'models' in payload)?(payload as {models:unknown}).models:null;
  if(!Array.isArray(models))return {ready:false,reason:'unreachable'};
  const desired=ollamaConfig().model;
  const found=models.some((item:unknown)=>item&&typeof item==='object'&&(('name' in item&&(item as {name:unknown}).name===desired)||('model' in item&&(item as {model:unknown}).model===desired)));
  return found?{ready:true,reason:'ready'}:{ready:false,reason:'model_missing'};
 }catch{return {ready:false,reason:'unreachable'}}finally{clearTimeout(timeout)}
}
export async function generateWithLocalAi(input:{businessName:string;industry:string;description:string;services:string[];contactEmail?:string}):Promise<AiGenerationResult>{
 let draft!:AiDraft;
 {
 const config=ollamaConfig();const url=config.url;
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
 try{const response=await fetch(new URL('/api/generate',url),{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',...config.headers},body:JSON.stringify({model:config.model,stream:false,format:'json',prompt:'Return ONLY JSON with keys businessName, industry, description, services. Write concise accurate marketing copy using only facts supplied by user. Do not invent credentials, customer testimonials, pricing or performance claims. Keep all copy professional and family-friendly, including Halloween and seasonal topics: no graphic horror, gore, sexual content, drug promotion, or disturbing imagery descriptions. Input: '+JSON.stringify(input)})});
 if(!response.ok)throw Error('Local AI returned HTTP '+response.status);
 if(response.ok){const payload=await response.json();const parsed=DraftSchema.safeParse(JSON.parse(String(payload.response||'{}')));if(parsed.success){draft=parsed.data}else throw Error('Local AI returned an invalid draft')}
 }catch(error){throw new Error('Local AI unavailable: '+(error instanceof Error?error.message:'request failed'))}finally{clearTimeout(timeout)}
 }
 return {draft,provider:'ollama',pages:generateBusinessWebsite({...draft,contactEmail:input.contactEmail}).pages};
}
