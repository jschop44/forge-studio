import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../src/app/api/ai/status/route';

describe('local AI status',()=>{
 it('does not mistake a missing model for successful generation',async()=>{
  const previousFetch=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  const previousModel=process.env.OLLAMA_MODEL;
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   process.env.OLLAMA_MODEL='llama3.2:3b';
   globalThis.fetch=async()=>new Response(JSON.stringify({models:[]}),{status:200});
   const response=await GET();
   const body=await response.json();
   assert.equal(response.status,503);
   assert.equal(body.ready,false);
   assert.equal(body.reason,'model_missing');
   assert.equal(body.generationVerified,false);
   assert.equal(typeof body.capacity.active,'number');
  }finally{
   globalThis.fetch=previousFetch;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
   if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
  }
 });
 it('reports model availability without asserting generation passed',async()=>{
  const previousFetch=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  const previousModel=process.env.OLLAMA_MODEL;
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   process.env.OLLAMA_MODEL='llama3.2:3b';
   globalThis.fetch=async()=>new Response(JSON.stringify({models:[{name:'llama3.2:3b'}]}),{status:200});
   const response=await GET();
   const body=await response.json();
   assert.equal(response.status,200);
   assert.equal(body.ready,true);
   assert.equal(body.reason,'ready');
   assert.equal(body.generationVerified,false);
  }finally{
   globalThis.fetch=previousFetch;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
   if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
  }
 });
});
