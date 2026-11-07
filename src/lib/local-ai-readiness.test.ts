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
