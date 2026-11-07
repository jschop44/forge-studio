import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLocalAiReadiness} from './server/local-ai';

test('readiness reports installed local model without generating content',async()=>{
 const previousFetch=globalThis.fetch,previousUrl=process.env.OLLAMA_URL,previousModel=process.env.OLLAMA_MODEL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';process.env.OLLAMA_MODEL='llama3.2:3b';
  globalThis.fetch=async()=>new Response(JSON.stringify({models:[{name:'llama3.2:3b'}]}),{status:200});
  assert.deepEqual(await checkLocalAiReadiness(),{ready:true,reason:'ready'});
  globalThis.fetch=async()=>new Response(JSON.stringify({models:[{name:'other:latest'}]}),{status:200});
  assert.deepEqual(await checkLocalAiReadiness(),{ready:false,reason:'model_missing'});
  globalThis.fetch=async()=>{throw Error('offline')};
  assert.deepEqual(await checkLocalAiReadiness(),{ready:false,reason:'unreachable'});
 }finally{
  globalThis.fetch=previousFetch;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
 }
});


test('readiness authenticates cloud Ollama and checks the configured model',async()=>{
 const previousFetch=globalThis.fetch,previousKey=process.env.OLLAMA_API_KEY,previousModel=process.env.OLLAMA_MODEL;
 try{
  process.env.OLLAMA_API_KEY='test-only-token';process.env.OLLAMA_MODEL='gemma4:31b';
  let checked=false;
  globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),'https://ollama.com/api/tags');
   assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-only-token');
   checked=true;
   return new Response(JSON.stringify({models:[{model:'gemma4:31b'}]}),{status:200});
  };
  assert.deepEqual(await checkLocalAiReadiness(),{ready:true,reason:'ready'});
  assert.equal(checked,true);
 }finally{
  globalThis.fetch=previousFetch;
  if(previousKey===undefined)delete process.env.OLLAMA_API_KEY;else process.env.OLLAMA_API_KEY=previousKey;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
 }
});
