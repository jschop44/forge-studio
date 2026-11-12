import {normalizeBusinessOfferings} from '../business-brief';
import {designAdvice,notifyGeneration} from './workflow-adapters';
import {randomUUID} from 'node:crypto';
import {discoverBusinessVisualsForOfferings} from './business-visuals';
import {licensedBusinessVisualAssets,type VisualAsset} from '../visual-assets';
import {summarizeAiError} from './ai-error';
import {z} from 'zod';
import type {WebsiteExperience} from '../website-experience';
import {generateWorkersComposition,type WorkersAiBinding} from './workers-ai-composition';
import {DesignSchema,parseAiComposition,compositionAppearance,compositionInstruction,compositionJsonSchema} from '../ai-composition';
import {generateBusinessWebsite} from '../business-site';
import {ensurePagePhotography} from '../ensure-page-photography';
const CopySchema=z.object({description:z.string().trim().min(15).max(1800)});
const DraftSchema=z.object({businessName:z.string().min(2).max(100),industry:z.string().min(2).max(80),description:z.string().min(15).max(1800),services:z.array(z.string().min(2).max(100)).min(1).max(12),design:DesignSchema.optional()});
export type AiDraft=z.infer<typeof DraftSchema>;
export type AiGenerationResult={draft:AiDraft;provider:'ollama'|'cloudflare';pages:ReturnType<typeof generateBusinessWebsite>['pages']};
function ollamaConfig(){
 // Ollama is used only for local development. Cloudflare Workers AI uses an account binding.
 const url=new URL(process.env.OLLAMA_URL||'http://127.0.0.1:11434');
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.protocol!=='http:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('OLLAMA_URL must be a loopback endpoint');
 if(['OPENAI_API_KEY','OPENAI_BASE_URL','OPENAI_MODEL'].some(name=>Boolean(process.env[name]?.trim())))throw Error('OpenAI API configuration is prohibited');
 const model=process.env.OLLAMA_MODEL||'llama3.2:3b';
 if(/beam|:cloud\b|\bcloud\b/i.test(model))throw Error('Paid/cloud models are disabled for free beta');
 return {url,model,headers:{} as Record<string,string>};
}
// Cloudflare Workers AI runs through an account binding; no API token is exposed to clients.
// Local development continues to use loopback Ollama.
async function workersAi():Promise<WorkersAiBinding|null>{
 try{
  const {getCloudflareContext}=await import('@opennextjs/cloudflare');
  const context=await getCloudflareContext({async:true});
  const binding=(context.env as unknown as {AI?:WorkersAiBinding}).AI;
  return binding&&typeof binding.run==='function'?binding:null;
 }catch{return null}
}
export function extractWorkersCopy(output:unknown):string{
 if(!output||typeof output!=='object')throw Error('Workers AI returned no content');
 const result=output as {response?:unknown;output?:unknown};
 const value=typeof result.response==='string'?result.response:typeof result.output==='string'?result.output:null;
 if(!value)throw Error('Workers AI returned no text');
 const clean=value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let text=clean;
 try{const parsed=JSON.parse(clean) as {description?:unknown};if(typeof parsed.description==='string')text=parsed.description}catch{/* Plain text is accepted after validation. */}
 const parsed=CopySchema.safeParse({description:text});
 if(!parsed.success)throw Error('Workers AI returned invalid copy');
 return parsed.data.description;
}
export async function checkLocalAiReadiness():Promise<{ready:boolean;reason:'ready'|'unreachable'|'model_missing'|'invalid_endpoint'}>{
 const cloudAi=await workersAi();
 if(cloudAi)return {ready:true,reason:'ready'};
 let url:URL;
 try{
  url=ollamaConfig().url;
 }catch{return {ready:false,reason:'invalid_endpoint'}}
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),3000);
 try{
  const response=await fetch(new URL('/api/tags',url),{signal:controller.signal,redirect:'error',cache:'no-store',headers:ollamaConfig().headers});
  if(!response.ok)return {ready:false,reason:'unreachable'};
  const payload:unknown=await response.json();
  const models=(payload&&typeof payload==='object'&&'models' in payload)?(payload as {models:unknown}).models:null;
  if(!Array.isArray(models))return {ready:false,reason:'unreachable'};
  const desired=ollamaConfig().model;
  const found=models.some((item:unknown)=>item&&typeof item==='object'&&(('name' in item&&(item as {name:unknown}).name===desired)||('model' in item&&(item as {model:unknown}).model===desired)));
  return found?{ready:true,reason:'ready'}:{ready:false,reason:'model_missing'};
 }catch{return {ready:false,reason:'unreachable'}}finally{clearTimeout(timeout)}
}
// Free-tier CPU inference cannot safely process unlimited simultaneous prompts.
// Reject excess work promptly instead of building an unbounded in-memory queue.
const MAX_ACTIVE_GENERATIONS=2;
let activeGenerations=0;
export function localAiCapacity(){return {active:activeGenerations,capacity:MAX_ACTIVE_GENERATIONS}}
export async function generateWithLocalAi(input:{businessName:string;industry:string;description:string;services:string[];contactEmail?:string;visualAssets?:VisualAsset[];experienceStyle?:WebsiteExperience;designLayout?:'editorial'|'image-led'}):Promise<AiGenerationResult>{
 if(activeGenerations>=MAX_ACTIVE_GENERATIONS)throw Error('Local AI capacity exceeded');
 activeGenerations++;
 const eventId=randomUUID();
 try {
 input={...input,services:normalizeBusinessOfferings(input.industry,input.services)};
 const {visualAssets,...businessInput}=input;
 const advice=input.designLayout?{status:'not-configured' as const}:await designAdvice({industry:input.industry,services:input.services});
 const designLayout=input.designLayout||advice.layout;
 let description!:string;
 let design!:z.infer<typeof DesignSchema>;
 let provider:'ollama'|'cloudflare'='ollama';
 const cloudAi=await workersAi();
 if(cloudAi){
   try{
    const composition=await generateWorkersComposition(cloudAi,businessInput);
    description=composition.description;design=composition.design;
   }catch(error){
    // Do not log the user's prompt, model response, or credentials.
    const {code,failureKind}=summarizeAiError(error);
    console.error('Workers AI inference failed',{code,failureKind,category:error instanceof Error&&error.message.startsWith('Workers AI returned')?'invalid_model_response':'provider_failure'});
    throw new Error(error instanceof Error&&error.message.startsWith('Workers AI returned')?'WORKERS_AI_INVALID_RESPONSE':'WORKERS_AI_PROVIDER_FAILURE');
   }
   provider='cloudflare';
 }else{
 const config=ollamaConfig();const url=config.url;
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
 try{const response=await fetch(new URL('/api/generate',url),{method:'POST',signal:controller.signal,redirect:'error',headers:{'Content-Type':'application/json',...config.headers},body:JSON.stringify({model:config.model,stream:false,format:compositionJsonSchema,keep_alive:'10m',options:{num_predict:360,num_ctx:2048,temperature:0.3},prompt:compositionInstruction+' Input: '+JSON.stringify(businessInput)})});
 if(!response.ok)throw Error('Local AI returned HTTP '+response.status);
 if(response.ok){const payload=await response.json();const composition=parseAiComposition(String(payload.response||''));description=composition.description;design=composition.design}
 }catch(error){throw new Error('Local AI unavailable: '+(error instanceof Error?error.message:'request failed'))}finally{clearTimeout(timeout)}
 }
 // The model may improve descriptive copy, but cannot rename or reclassify a business.
 // Preserve the verified user-provided identity and service offering.
 const verifiedDraft:AiDraft={
  businessName:input.businessName.trim(),
  industry:input.industry.trim(),
  description,design,
  services:input.services.map(service=>service.trim())
 };
 const validated=DraftSchema.parse(verifiedDraft);
 const selectedVisuals=visualAssets?.length?licensedBusinessVisualAssets(input.industry,input.services,visualAssets):await discoverBusinessVisualsForOfferings(input.industry,input.services);
 const pages=ensurePagePhotography(generateBusinessWebsite({...validated,...compositionAppearance(design),...(designLayout?{layout:designLayout}:{}),visualAssets:selectedVisuals,contactEmail:input.contactEmail,experienceStyle:input.experienceStyle||'standard'}).pages,input.industry,selectedVisuals,input.services);
 await notifyGeneration({id:eventId,type:'draft.generated',provider,pageCount:pages.length});
 return {draft:validated,provider,pages};
 } catch(error){await notifyGeneration({id:eventId,type:'draft.failed'});throw error} finally {activeGenerations--}
}

/** Open-vocabulary recognition uses the same free, bounded providers as generation. */
export async function recognizeBusinessWithLocalAi(input:{businessName:string;brief:string}){
 if(activeGenerations>=MAX_ACTIVE_GENERATIONS)throw Error('Local AI capacity exceeded');
 activeGenerations++;
 try{
  const {recognitionInstruction,recognitionJsonSchema,parseBusinessRecognition}=await import('../business-recognition');
  const cloud=await workersAi();
  if(cloud){
   const output=await cloud.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{messages:[{role:'system',content:recognitionInstruction},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_schema',json_schema:recognitionJsonSchema},max_tokens:400,temperature:0.1}) as {response?:unknown;output?:unknown};
   return {...parseBusinessRecognition(output?.response??output?.output,input),provider:'cloudflare'};
  }
  const config=ollamaConfig();
  const response=await fetch(new URL('/api/generate',config.url),{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json'},body:JSON.stringify({model:config.model,stream:false,format:recognitionJsonSchema,keep_alive:'10m',options:{num_predict:400,num_ctx:2048,temperature:0.1},prompt:recognitionInstruction+' Input: '+JSON.stringify(input)})});
  if(!response.ok)throw Error('Business recognition provider unavailable');
  const output=await response.json();return {...parseBusinessRecognition(output.response,input),provider:'ollama'};
 }finally{activeGenerations--}
}
