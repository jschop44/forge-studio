import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWithLocalAi,checkLocalAiReadiness} from './server/local-ai';

const brief={businessName:'Northstar Coffee',industry:'Coffee shop',description:'Independent neighborhood coffee shop serving freshly roasted drinks.',services:['Espresso','Coffee beans']};

test('local AI is mandatory even when legacy ENABLE_LOCAL_AI is unset',async()=>{
 const previous=process.env.ENABLE_LOCAL_AI;
 const previousUrl=process.env.OLLAMA_URL;
 const previousKey=process.env.OLLAMA_API_KEY;
 const previousFetch=globalThis.fetch;
 let requested=false;
 try{
  delete process.env.ENABLE_LOCAL_AI;
  delete process.env.OLLAMA_API_KEY;
  process.env.OLLAMA_URL='http://127.0.0.1:11434';
  globalThis.fetch=async()=>{requested=true;throw new Error('model offline')};
  await assert.rejects(generateWithLocalAi(brief),/Local AI unavailable/);
  assert.equal(requested,true);
 }finally{
  globalThis.fetch=previousFetch;
  if(previous===undefined)delete process.env.ENABLE_LOCAL_AI;else process.env.ENABLE_LOCAL_AI=previous;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  if(previousKey===undefined)delete process.env.OLLAMA_API_KEY;else process.env.OLLAMA_API_KEY=previousKey;
 }
});

test('local AI rejects an invalid model draft instead of using deterministic output',async()=>{
 const previousFetch=globalThis.fetch;
 const previousUrl=process.env.OLLAMA_URL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';
  globalThis.fetch=async()=>new Response(JSON.stringify({response:'{}'}),{status:200});
  await assert.rejects(generateWithLocalAi(brief),/invalid draft/);
 }finally{
  globalThis.fetch=previousFetch;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
 }
});


test('legacy cloud API key cannot redirect requests to paid Ollama Cloud',async()=>{
 const previousFetch=globalThis.fetch,previousKey=process.env.OLLAMA_API_KEY,previousUrl=process.env.OLLAMA_URL,previousModel=process.env.OLLAMA_MODEL;
 try{
  process.env.OLLAMA_API_KEY='test-only-token';process.env.OLLAMA_URL='http://127.0.0.1:11434';process.env.OLLAMA_MODEL='llama3.2:3b';
  globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),'http://127.0.0.1:11434/api/generate');
   assert.equal((init?.headers as Record<string,string>).Authorization,undefined);
   return new Response(JSON.stringify({response:JSON.stringify(brief)}),{status:200});
  };
  const result=await generateWithLocalAi(brief);
  assert.equal(result.provider,'ollama');
  assert.deepEqual(result.pages.map(page=>page.slug),['index','services','about','contact']);
  for(const page of result.pages)assert.ok(page.html.includes("getContext('webgl'"));
 }finally{
  globalThis.fetch=previousFetch;
  if(previousKey===undefined)delete process.env.OLLAMA_API_KEY;else process.env.OLLAMA_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
 }
});

test('Beam and cloud-tagged models fail closed without a network request',async()=>{
 const previousFetch=globalThis.fetch,previousModel=process.env.OLLAMA_MODEL,previousUrl=process.env.OLLAMA_URL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';
  globalThis.fetch=async()=>{throw new Error('unexpected network request')};
  for(const model of ['beam','beam:cloud','reflection/beam','reflection/beam:latest','gemma4:cloud']){
   process.env.OLLAMA_MODEL=model;
   await assert.rejects(generateWithLocalAi(brief),/Paid.cloud models are disabled/);
  }
 }finally{
  globalThis.fetch=previousFetch;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
 }
});

test('free beta rejects remote Ollama endpoints even with a legacy cloud key',async()=>{
 const previousFetch=globalThis.fetch,previousUrl=process.env.OLLAMA_URL,previousKey=process.env.OLLAMA_API_KEY,previousModel=process.env.OLLAMA_MODEL;
 try{
  process.env.OLLAMA_URL='https://ollama.com';process.env.OLLAMA_API_KEY='test-only-token';process.env.OLLAMA_MODEL='llama3.2:3b';
  globalThis.fetch=async()=>{throw new Error('remote request must not be sent')};
  await assert.rejects(generateWithLocalAi(brief),/OLLAMA_URL must be a loopback endpoint/);
 }finally{
  globalThis.fetch=previousFetch;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  if(previousKey===undefined)delete process.env.OLLAMA_API_KEY;else process.env.OLLAMA_API_KEY=previousKey;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
 }
});

test('free beta rejects URL credentials and remote tunneling addresses',async()=>{
 const previousFetch=globalThis.fetch,previousUrl=process.env.OLLAMA_URL,previousModel=process.env.OLLAMA_MODEL;
 try{
  process.env.OLLAMA_MODEL='llama3.2:3b';
  globalThis.fetch=async()=>{throw new Error('unexpected network request')};
  for(const endpoint of ['https://ollama.com','http://example.com:11434','http://user:pass@127.0.0.1:11434','http://127.0.0.1:11434/forward']){
   process.env.OLLAMA_URL=endpoint;
   await assert.rejects(generateWithLocalAi(brief),/OLLAMA_URL must be a loopback endpoint/);
  }
 }finally{
  globalThis.fetch=previousFetch;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
 }
});

test('local Ollama generation disables HTTP redirects',async()=>{
 const previousFetch=globalThis.fetch,previousUrl=process.env.OLLAMA_URL,previousModel=process.env.OLLAMA_MODEL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';process.env.OLLAMA_MODEL='llama3.2:3b';
  globalThis.fetch=async(_input,init)=>{
   assert.equal(init?.redirect,'error');
   return new Response(JSON.stringify({response:JSON.stringify(brief)}),{status:200});
  };
  const result=await generateWithLocalAi(brief);
  assert.equal(result.provider,'ollama');
 }finally{
  globalThis.fetch=previousFetch;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
 }
});

test('AI readiness is false when the required local model is absent',async()=>{
 const previousFetch=globalThis.fetch,previousUrl=process.env.OLLAMA_URL,previousModel=process.env.OLLAMA_MODEL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';process.env.OLLAMA_MODEL='llama3.2:3b';
  globalThis.fetch=async(_input,init)=>{
   assert.equal(init?.redirect,'error');
   return new Response(JSON.stringify({models:[{name:'other:latest'}]}),{status:200});
  };
  assert.deepEqual(await checkLocalAiReadiness(),{ready:false,reason:'model_missing'});
 }finally{
  globalThis.fetch=previousFetch;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
 }
});

test('AI readiness rejects a paid Beam model before requesting any endpoint',async()=>{
 const previousFetch=globalThis.fetch,previousModel=process.env.OLLAMA_MODEL,previousUrl=process.env.OLLAMA_URL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';process.env.OLLAMA_MODEL='reflection/beam';
  globalThis.fetch=async()=>{throw new Error('unexpected request')};
  assert.deepEqual(await checkLocalAiReadiness(),{ready:false,reason:'invalid_endpoint'});
 }finally{
  globalThis.fetch=previousFetch;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
 }
});
