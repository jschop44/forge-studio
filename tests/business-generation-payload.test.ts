import test from 'node:test';
import assert from 'node:assert/strict';
import {businessGenerationPayload} from '../src/lib/business-generation-payload';
import {POST} from '../src/app/api/ai/business/route';
import {NextRequest} from 'next/server';
const asset={url:'https://images.unsplash.com/coffee',source:'https://unsplash.com/photos/coffee',title:'Coffee roastery '+ 'a'.repeat(300),credit:'a'.repeat(250),license:'CC0'};
test('extracted evidence stays local while full image credits survive',()=>{
 const input={businessName:'Cedar Coffee',industry:'Coffee shop',description:'Fresh coffee. '.repeat(500),services:['Roasted coffee'],visualSignals:{evidence:'x'.repeat(100000)},visualAssets:Array.from({length:10},()=>({...asset}))};
 const payload=businessGenerationPayload(input);
 assert.equal(payload.description.length,1800);assert.equal(payload.visualAssets.length,10);
 assert.equal('visualSignals' in payload,false);assert.equal(input.visualSignals.evidence.length,100000);
 assert.equal(input.description.length,7000);assert.equal(input.visualAssets.length,10);
 assert.ok(JSON.stringify(payload).length>8000);
});
test('valid image-rich briefs above 8 KB reach inference',async()=>{
 const old=globalThis.fetch,oldUrl=process.env.OLLAMA_URL;let calls=0;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({response:JSON.stringify({design:{layout:'editorial',palette:'sand'},description:'Fresh coffee roasted for our local community.'})}))};
  const body=JSON.stringify({businessName:'Cedar Coffee',industry:'Coffee shop',description:'Coffee roasting services. '.repeat(60),services:['Roasted coffee'],visualAssets:Array.from({length:12},()=>({...asset}))});
  assert.ok(body.length>8000);
  const response=await POST(new NextRequest('http://localhost/api/ai/business',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body}));
  assert.equal(response.status,200);assert.equal(calls,1);assert.equal((await response.json()).pages.length,4);
 }finally{globalThis.fetch=old;if(oldUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=oldUrl}
});
test('oversized UTF-8 requests are bounded before inference without content-length',async()=>{
 const body=JSON.stringify({businessName:'Cedar Coffee',description:'珈'.repeat(23000)});
 assert.ok(body.length<65536);assert.ok(new TextEncoder().encode(body).byteLength>65536);
 const response=await POST(new NextRequest('http://localhost/api/ai/business',{method:'POST',headers:{Origin:'http://localhost'},body}));
 assert.equal(response.status,413);
});
