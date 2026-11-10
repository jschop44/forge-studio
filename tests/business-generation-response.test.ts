import test from 'node:test';
import assert from 'node:assert/strict';
import {businessGenerationResponse} from '../src/lib/server/business-generation-response';
import {generateBusinessWebsite} from '../src/lib/business-site';
import type {AiGenerationResult} from '../src/lib/server/local-ai';
import {NextRequest} from 'next/server';
import {POST} from '../src/app/api/ai/business/route';

const draft={businessName:'Harbor Coffee',industry:'Coffee shop',description:'A neighborhood coffee shop serving fresh espresso and roasted coffee beans.',services:['Coffee beans','Espresso']};
function result():AiGenerationResult{return {draft,provider:'cloudflare',pages:generateBusinessWebsite(draft).pages}}

test('business generation route returns server-validated pages after model inference',async()=>{
 const fetcher=globalThis.fetch,previousUrl=process.env.OLLAMA_URL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';
  globalThis.fetch=async()=>new Response(JSON.stringify({response:JSON.stringify({description:draft.description,design:{layout:'editorial',palette:'sand'}})}));
  const request=new NextRequest('http://localhost/api/ai/business',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify(draft)});
  const response=await POST(request);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.quality.readyForReview,true);
  assert.equal(body.quality.pageCount,body.pages.length);
  assert.equal(body.quality.readyForPublishing,false);
 }finally{
  globalThis.fetch=fetcher;
  if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
 }
});

test('business generation response includes static QA for every page without publication approval',async()=>{
 const response=businessGenerationResponse(result());
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json();
 assert.equal(body.quality.readyForReview,true);
 assert.equal(body.quality.readyForPublishing,false);
 assert.equal(body.quality.pageCount,4);
 assert.equal(body.pages.length,4);
});

test('business generation response blocks a broken later page and returns useful errors without its draft',async()=>{
 const broken=result();
 broken.pages[3].html=broken.pages[3].html.replace('</body>','<a href="missing.html">Missing destination</a></body>');
 const response=businessGenerationResponse(broken);
 assert.equal(response.status,422);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json();
 assert.match(body.error,/contact: broken internal link to missing/);
 assert.equal(body.quality.readyForReview,false);
 assert.equal(body.pages,undefined);
});

test('business generation response rejects missing pages, duplicate routes and malformed documents',async()=>{
 for(const pages of [[],[result().pages[0],result().pages[0]],[{slug:'index',title:'Home',html:'<h1>Incomplete</h1>'}]]){
  const response=businessGenerationResponse({...result(),pages});
  assert.equal(response.status,422);
  const body=await response.json();
  assert.ok(body.quality.errors.length);
  assert.equal(body.quality.readyForPublishing,false);
  assert.equal(body.pages,undefined);
 }
});
