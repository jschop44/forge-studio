import {z} from 'zod';
import {generateBusinessWebsite} from '../business-site';
const DraftSchema=z.object({businessName:z.string().min(2).max(100),industry:z.string().min(2).max(80),description:z.string().min(15).max(1800),services:z.array(z.string().min(2).max(100)).min(1).max(12)});
export type AiDraft=z.infer<typeof DraftSchema>;
export type AiGenerationResult={draft:AiDraft;provider:'ollama';pages:ReturnType<typeof generateBusinessWebsite>['pages']};
function fallback(input:{businessName:string;industry:string;description:string;services:string[]}):AiDraft{return DraftSchema.parse({businessName:input.businessName,industry:input.industry,description:input.description.length>=15?input.description:'Professional services designed around your business goals.',services:input.services.length?input.services:['Consulting','Support']})}
export async function checkLocalAiReadiness():Promise<{ready:boolean;reason:'ready'|'unreachable'|'model_missing'|'invalid_endpoint'}>{
 let url:URL;
 try{
  url=new URL(process.env.OLLAMA_URL||'http://127.0.0.1:11434');
  if(!['localhost','127.0.0.1','::1'].includes(url.hostname)||!['http:','https:'].includes(url.protocol))return {ready:false,reason:'invalid_endpoint'};
 }catch{return {ready:false,reason:'invalid_endpoint'}}
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),3000);
 try{
  const response=await fetch(new URL('/api/tags',url),{signal:controller.signal,cache:'no-store'});
  if(!response.ok)return {ready:false,reason:'unreachable'};
  const payload:unknown=await response.json();
  const models=(payload&&typeof payload==='object'&&'models' in payload)?(payload as {models:unknown}).models:null;
  if(!Array.isArray(models))return {ready:false,reason:'unreachable'};
  const desired=process.env.OLLAMA_MODEL||'llama3.2:3b';
  const found=models.some((item:unknown)=>item&&typeof item==='object'&&'name' in item&&(item as {name:unknown}).name===desired);
  return found?{ready:true,reason:'ready'}:{ready:false,reason:'model_missing'};
 }catch{return {ready:false,reason:'unreachable'}}finally{clearTimeout(timeout)}
}
export async function generateWithLocalAi(input:{businessName:string;industry:string;description:string;services:string[];contactEmail?:string}):Promise<AiGenerationResult>{
 let draft=fallback(input);
 {
 const endpoint=process.env.OLLAMA_URL||'http://127.0.0.1:11434';
 const url=new URL(endpoint);if(!['localhost','127.0.0.1','::1'].includes(url.hostname)||!['http:','https:'].includes(url.protocol))throw Error('OLLAMA_URL must be a loopback endpoint');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),18000);
 try{const response=await fetch(new URL('/api/generate',url),{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OLLAMA_MODEL||'llama3.2:3b',stream:false,format:'json',prompt:'Return ONLY JSON with keys businessName, industry, description, services. Write concise accurate marketing copy using only facts supplied by user. Do not invent credentials, customer testimonials, pricing or performance claims. Keep all copy professional and family-friendly, including Halloween and seasonal topics: no graphic horror, gore, sexual content, drug promotion, or disturbing imagery descriptions. Input: '+JSON.stringify(input)})});
 if(!response.ok)throw Error('Local AI returned HTTP '+response.status);
 if(response.ok){const payload=await response.json();const parsed=DraftSchema.safeParse(JSON.parse(String(payload.response||'{}')));if(parsed.success){draft=parsed.data}else throw Error('Local AI returned an invalid draft')}
 }catch(error){throw new Error('Local AI unavailable: '+(error instanceof Error?error.message:'request failed'))}finally{clearTimeout(timeout)}
 }
 return {draft,provider:'ollama',pages:generateBusinessWebsite({...draft,contactEmail:input.contactEmail}).pages};
}
