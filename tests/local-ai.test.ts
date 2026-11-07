import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {generateWithLocalAi,localAiCapacity} from '../src/lib/server/local-ai';
describe('mandatory local AI generation',()=>{
 it('generates a complete business site from a valid local model response',async()=>{
  const previousFetch=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   globalThis.fetch=async(_input,init)=>{const payload=JSON.parse(String(init?.body));assert.equal(payload.keep_alive,'10m');assert.equal(payload.options.num_predict,240);assert.equal(payload.options.num_ctx,2048);assert.equal(payload.stream,false);assert.match(payload.prompt,/one key: description/);return new Response(JSON.stringify({response:JSON.stringify({description:'A small creative studio helping local businesses grow.'})}),{status:200})};
   const result=await generateWithLocalAi({businessName:'Cedar Studio',industry:'Design',description:'A small creative studio helping local businesses grow.',services:['Website design','Brand strategy']});
   assert.equal(result.provider,'ollama');
   assert.equal(result.pages.length,4);
   assert.ok(result.pages[0].html.includes('application/ld+json'));
  }finally{
   globalThis.fetch=previousFetch;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  }
 });
 it('caps concurrent inference and releases all slots after completion',async()=>{
  const previousFetch=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve});
  let started=0;
  const input={businessName:'Cedar Studio',industry:'Design',description:'An independent studio helping local businesses improve their websites.',services:['Website design']};
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   globalThis.fetch=async()=>{
    started++;
    await gate;
    return new Response(JSON.stringify({response:JSON.stringify({description:input.description})}),{status:200});
   };
   const first=generateWithLocalAi(input);
   const second=generateWithLocalAi(input);
   assert.equal(localAiCapacity().active,2);
   await assert.rejects(generateWithLocalAi(input),/capacity exceeded/);
   assert.equal(started,2);
   release();
   await Promise.all([first,second]);
   assert.equal(localAiCapacity().active,0);
  }finally{
   release();
   globalThis.fetch=previousFetch;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  }
 });
 it('accepts description-only output while retaining verified business details',async()=>{
  const previousFetch=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  const input={businessName:'Oak Architects',industry:'Architecture',description:'A residential architecture practice creating thoughtful spaces for local homeowners.',services:['Residential planning']};
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   globalThis.fetch=async()=>new Response(JSON.stringify({response:JSON.stringify({description:'Thoughtful residential architecture and planning for local homeowners.'})}),{status:200});
   const result=await generateWithLocalAi(input);
   assert.equal(result.draft.businessName,input.businessName);
   assert.equal(result.draft.industry,input.industry);
   assert.deepEqual(result.draft.services,input.services);
   assert.equal(result.pages.length,4);
  }finally{
   globalThis.fetch=previousFetch;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  }
 });
 it('releases capacity after a malformed local-model response',async()=>{
  const previousFetch=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  const input={businessName:'Oak Architects',industry:'Architecture',description:'A residential architecture practice creating thoughtful spaces for local homeowners.',services:['Residential planning']};
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   globalThis.fetch=async()=>new Response(JSON.stringify({response:'not json'}),{status:200});
   await assert.rejects(generateWithLocalAi(input),/Local AI unavailable/);
   assert.equal(localAiCapacity().active,0);
   globalThis.fetch=async()=>new Response(JSON.stringify({response:JSON.stringify({description:'Thoughtful residential architecture and planning for local homeowners.'})}),{status:200});
   const result=await generateWithLocalAi(input);
   assert.equal(result.pages.length,4);
   assert.equal(localAiCapacity().active,0);
  }finally{
   globalThis.fetch=previousFetch;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  }
 });
});
