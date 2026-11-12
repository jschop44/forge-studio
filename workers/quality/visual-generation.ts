import sharp from 'sharp';
import {createHash,randomUUID} from 'node:crypto';
import {isExcludedBusiness} from '../../src/lib/business-site';
sharp.cache({memory:32,files:0,items:32});sharp.concurrency(1);
export type BusinessVisualBrief={businessName:string;industry:string;description:string;services:string[]};
export async function optimizeRaster(input:Uint8Array){
 if(!input.length||input.length>12*1024*1024)throw Error('Image byte budget exceeded');
 const image=sharp(input,{limitInputPixels:40000000,failOn:'warning',animated:false});
 const metadata=await image.metadata();
 if(!['jpeg','png','webp','avif'].includes(metadata.format||'')||(metadata.pages||1)>1)throw Error('Only single-frame raster images are supported');
 const {data,info}=await image.rotate().resize({width:3840,height:2160,fit:'inside',withoutEnlargement:true}).webp({quality:86,effort:4}).timeout({seconds:8}).toBuffer({resolveWithObject:true});
 if(data.length>2*1024*1024)throw Error('Optimized image byte budget exceeded');
 return {bytes:data,width:info.width,height:info.height,mimeType:'image/webp' as const,sha256:createHash('sha256').update(data).digest('hex')};
}
export function comfyConfiguration(env:NodeJS.ProcessEnv=process.env){
 if(!env.COMFYUI_URL||!env.COMFYUI_WORKFLOW_JSON||!env.COMFYUI_PROMPT_NODE||!env.COMFYUI_OUTPUT_NODE||!env.COMFYUI_MODEL_LICENSE)return null;
 const url=new URL(env.COMFYUI_URL);
 const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 if((url.protocol!=='https:'&&!(local&&url.protocol==='http:'))||url.username||url.password||url.pathname!=='/'||url.hash||url.search)throw Error('Invalid ComfyUI endpoint');
 if(env.COMFYUI_WORKFLOW_JSON.length>100000)throw Error('Workflow exceeds budget');
 const workflow=JSON.parse(env.COMFYUI_WORKFLOW_JSON) as Record<string,{class_type:string;inputs:Record<string,unknown>}>;
 if(!workflow||Object.keys(workflow).length>50||!workflow[env.COMFYUI_PROMPT_NODE]?.inputs||!workflow[env.COMFYUI_OUTPUT_NODE])throw Error('Invalid configured workflow');
 for(const node of Object.values(workflow)){
  if(!node||typeof node.class_type!=='string'||!node.inputs)throw Error('Invalid workflow node');
  if(typeof node.inputs.steps==='number'&&node.inputs.steps>50||typeof node.inputs.batch_size==='number'&&node.inputs.batch_size!==1)throw Error('Workflow resource limit exceeded');
 }
 return {url,workflow,promptNode:env.COMFYUI_PROMPT_NODE,outputNode:env.COMFYUI_OUTPUT_NODE,license:env.COMFYUI_MODEL_LICENSE.slice(0,200),token:env.COMFYUI_TOKEN};
}
async function boundedBytes(response:Response,max:number){
 if(!response.ok||Number(response.headers.get('content-length'))>max){await response.body?.cancel();throw Error('Visual service response rejected')}
 const chunks:Uint8Array[]=[];let total=0;const reader=response.body?.getReader();if(!reader)throw Error('Visual service returned no body');
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw Error('Visual service byte budget exceeded')}chunks.push(value)}return Buffer.concat(chunks)}finally{reader.releaseLock()}
}
/** Owner-configured workflow only; model endpoints/tokens never enter returned assets. */
export async function generateComfyVisual(brief:BusinessVisualBrief,options:{env?:NodeJS.ProcessEnv;fetcher?:typeof fetch;timeoutMs?:number;pause?:(ms:number)=>Promise<void>}={}){
 const config=comfyConfiguration(options.env);if(!config)return {status:'not-configured' as const};
 if(isExcludedBusiness(brief))throw Error('Unsupported business category');
 const request=options.fetcher||fetch,deadline=Date.now()+Math.min(120000,Math.max(1000,options.timeoutMs||45000));
 const headers:Record<string,string>={'Content-Type':'application/json',...(config.token?{Authorization:'Bearer '+config.token}:{})};
 const call=async(path:string,init:RequestInit={},max=300000)=>boundedBytes(await request(new URL(path,config.url),{...init,headers,redirect:'error',signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))}),max);
 const prompt='Create one family-friendly, sharp, business-relevant editorial photograph or illustration. No text, invented logos, unrelated products, nudity or illicit drugs. Business facts: '+JSON.stringify({name:brief.businessName.slice(0,100),industry:brief.industry.slice(0,80),description:brief.description.slice(0,600),offerings:brief.services.slice(0,8)});
 config.workflow[config.promptNode].inputs.text=prompt;
 const submitted=JSON.parse((await call('/prompt',{method:'POST',body:JSON.stringify({prompt:config.workflow,client_id:randomUUID()})})).toString());
 if(typeof submitted.prompt_id!=='string'||!/^[\w-]{1,100}$/.test(submitted.prompt_id))throw Error('Invalid generation job identifier');
 const id=submitted.prompt_id;
 try{
  for(let attempt=0;attempt<120&&Date.now()<deadline;attempt++){
   const history=JSON.parse((await call('/history/'+encodeURIComponent(id))).toString());
   const job=history[id];if(job?.status?.status_str==='error')throw Error('Image workflow failed');
   const output=job?.outputs?.[config.outputNode]?.images?.[0];
   if(output){
    if(typeof output.filename!=='string'||!/^[\w .-]{1,200}\.(?:png|jpe?g|webp|avif)$/i.test(output.filename)||typeof output.subfolder!=='string'||output.subfolder.includes('..')||!['output','temp'].includes(output.type))throw Error('Invalid generated image reference');
    const query=new URLSearchParams({filename:output.filename,subfolder:output.subfolder,type:output.type});
    const image=await optimizeRaster(await call('/view?'+query,{},12*1024*1024));
    if(image.width<1280||image.height<720)throw Error('Generated image resolution is too low');
    return {status:'generated' as const,asset:{...image,bytes:image.bytes.toString('base64'),encoding:'base64' as const,subject:brief.industry,license:config.license,requiresVisualReview:true as const}};
   }
   await (options.pause||((ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))))(Math.min(1000,Math.max(1,deadline-Date.now())));
  }
  throw Error('Image generation time budget exceeded');
 }catch(error){
  // Remove only our pending job. Never issue a global interrupt affecting other users.
  try{await request(new URL('/queue',config.url),{method:'POST',headers,redirect:'error',signal:AbortSignal.timeout(2000),body:JSON.stringify({delete:[id]})})}catch{}
  throw error;
 }
}
