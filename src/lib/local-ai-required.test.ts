import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWithLocalAi} from './server/local-ai';

const brief={businessName:'Northstar Coffee',industry:'Coffee shop',description:'Independent neighborhood coffee shop serving freshly roasted drinks.',services:['Espresso','Coffee beans']};

test('local AI is mandatory even when legacy ENABLE_LOCAL_AI is unset',async()=>{
 const previous=process.env.ENABLE_LOCAL_AI;
 const previousUrl=process.env.OLLAMA_URL;
 const previousFetch=globalThis.fetch;
 let requested=false;
 try{
  delete process.env.ENABLE_LOCAL_AI;
  process.env.OLLAMA_URL='http://127.0.0.1:11434';
  globalThis.fetch=async()=>{requested=true;throw new Error('model offline')};
  await assert.rejects(generateWithLocalAi(brief),/Local AI unavailable/);
  assert.equal(requested,true);
 }finally{
  globalThis.fetch=previousFetch;
  if(previous===undefined)delete process.env.ENABLE_LOCAL_AI;else process.env.ENABLE_LOCAL_AI=previous;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
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


test('authenticated cloud AI generates website pages without deterministic fallback',async()=>{
 const previousFetch=globalThis.fetch,previousKey=process.env.OLLAMA_API_KEY,previousModel=process.env.OLLAMA_MODEL;
 try{
  process.env.OLLAMA_API_KEY='test-only-token';process.env.OLLAMA_MODEL='gemma4:31b';
  let requested=false;
  globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),'https://ollama.com/api/generate');
   assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-only-token');
   const body=JSON.parse(String(init?.body));
   assert.equal(body.model,'gemma4:31b');
   assert.equal(body.stream,false);
   requested=true;
   return new Response(JSON.stringify({response:JSON.stringify(brief)}),{status:200});
  };
  const result=await generateWithLocalAi(brief);
  assert.equal(requested,true);
  assert.equal(result.provider,'ollama');
  assert.equal(result.draft.businessName,brief.businessName);
  assert.ok(result.pages.length>0);
 }finally{
  globalThis.fetch=previousFetch;
  if(previousKey===undefined)delete process.env.OLLAMA_API_KEY;else process.env.OLLAMA_API_KEY=previousKey;
  if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
 }
});

test('cloud AI accepts markdown-fenced JSON without weakening draft validation',async()=>{
 const previousFetch=globalThis.fetch,previousKey=process.env.OLLAMA_API_KEY;
 try{
  process.env.OLLAMA_API_KEY='test-only-token';
  globalThis.fetch=async()=>new Response(JSON.stringify({response:'```json\n'+JSON.stringify(brief)+'\n```'}),{status:200});
  const result=await generateWithLocalAi(brief);
  assert.equal(result.draft.businessName,'Northstar Coffee');
  assert.ok(result.pages.length>0);
 }finally{
  globalThis.fetch=previousFetch;
  if(previousKey===undefined)delete process.env.OLLAMA_API_KEY;else process.env.OLLAMA_API_KEY=previousKey;
 }
});
