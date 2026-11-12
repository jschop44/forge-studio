import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captureWithBrowserWorker} from '../src/lib/server/browser-capture-worker';
test('capture reuses the private worker and accepts only source-matching evidence',async()=>{
 const originalFetch=globalThis.fetch,oldUrl=process.env.FORGE_QUALITY_WORKER_URL,oldSecret=process.env.FORGE_QUALITY_WORKER_SECRET;
 try{
  delete process.env.FORGE_QUALITY_WORKER_URL;assert.equal(await captureWithBrowserWorker('https://example.com/'),null);
  process.env.FORGE_QUALITY_WORKER_URL='https://worker.example/review';process.env.FORGE_QUALITY_WORKER_SECRET='test-secret';
  let sourceUrl='https://example.com/';
  globalThis.fetch=async(url,init)=>{
   assert.equal(String(url),'https://worker.example/capture');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-secret');
   return Response.json({version:1,sourceUrl,capturedAt:new Date().toISOString(),viewport:{width:1280,height:800},pages:[{path:'/',title:'Example',screenshotUrl:'http://localhost/private',landmarks:[],interactions:[]}],warnings:[]});
  };
  const result=await captureWithBrowserWorker('https://example.com/');assert.ok(result);assert.equal(result.pages[0].screenshotUrl,undefined);
  sourceUrl='https://unrelated.example/';assert.equal(await captureWithBrowserWorker('https://example.com/'),null);
 }finally{
  globalThis.fetch=originalFetch;
  if(oldUrl===undefined)delete process.env.FORGE_QUALITY_WORKER_URL;else process.env.FORGE_QUALITY_WORKER_URL=oldUrl;
  if(oldSecret===undefined)delete process.env.FORGE_QUALITY_WORKER_SECRET;else process.env.FORGE_QUALITY_WORKER_SECRET=oldSecret;
 }
});
