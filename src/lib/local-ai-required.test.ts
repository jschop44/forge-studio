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
