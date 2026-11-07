import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {generateWithLocalAi} from '../src/lib/server/local-ai';
describe('mandatory local AI generation',()=>{
 it('generates a complete business site from a valid local model response',async()=>{
  const previousFetch=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   globalThis.fetch=async()=>new Response(JSON.stringify({response:JSON.stringify({businessName:'Cedar Studio',industry:'Design',description:'A small creative studio helping local businesses grow.',services:['Website design','Brand strategy']})}),{status:200});
   const result=await generateWithLocalAi({businessName:'Cedar Studio',industry:'Design',description:'A small creative studio helping local businesses grow.',services:['Website design','Brand strategy']});
   assert.equal(result.provider,'ollama');
   assert.equal(result.pages.length,4);
   assert.ok(result.pages[0].html.includes('application/ld+json'));
  }finally{
   globalThis.fetch=previousFetch;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  }
 });
});
