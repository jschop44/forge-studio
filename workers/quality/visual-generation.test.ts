import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {optimizeRaster,generateComfyVisual,comfyConfiguration} from './visual-generation';
const env={COMFYUI_URL:'http://127.0.0.1:8188',COMFYUI_PROMPT_NODE:'1',COMFYUI_OUTPUT_NODE:'2',COMFYUI_MODEL_LICENSE:'Owner-verified test model license',COMFYUI_WORKFLOW_JSON:JSON.stringify({'1':{class_type:'CLIPTextEncode',inputs:{text:''}},'2':{class_type:'SaveImage',inputs:{}}})};
test('Sharp produces bounded WebP without upscaling or retaining metadata',async()=>{
 const source=await sharp({create:{width:1920,height:1080,channels:3,background:'#315f37'}}).png().withMetadata().toBuffer();
 const result=await optimizeRaster(source);assert.equal(result.width,1920);assert.equal(result.height,1080);assert.equal((await sharp(result.bytes).metadata()).exif,undefined);assert.equal((await sharp(result.bytes).metadata()).format,'webp');
 await assert.rejects(optimizeRaster(Buffer.from('<svg/>')));
});
test('ComfyUI queues a configured workflow, retrieves only its output, and optimizes it',async()=>{
 const png=await sharp({create:{width:1920,height:1080,channels:3,background:'green'}}).png().toBuffer();const paths:string[]=[];
 const result=await generateComfyVisual({businessName:'Baseball House',industry:'Baseball',description:'Baseball equipment',services:['Gloves']},{env,pause:async()=>{},fetcher:async(input,init)=>{
  const url=new URL(String(input));paths.push(url.pathname);
  if(url.pathname==='/prompt'){const body=JSON.parse(String(init?.body));assert.match(body.prompt['1'].inputs.text,/Baseball/);return Response.json({prompt_id:'job-1'})}
  if(url.pathname==='/history/job-1')return Response.json({'job-1':{outputs:{'2':{images:[{filename:'output.png',subfolder:'',type:'output'}]}}}});
  return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png'}});
 }});
 assert.equal(result.status,'generated');assert.ok(result.asset?.requiresVisualReview);assert.deepEqual(paths,['/prompt','/history/job-1','/view']);assert.ok(!JSON.stringify(result).includes('127.0.0.1'));
 assert.equal((await generateComfyVisual({businessName:'Shop',industry:'Retail',description:'Retail',services:[]},{env:{}})).status,'not-configured');
 assert.throws(()=>comfyConfiguration({...env,COMFYUI_URL:'http://untrusted.example'}));
});
