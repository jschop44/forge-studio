import {test} from 'node:test';
import assert from 'node:assert/strict';
import {smokePreviewAi,validatePreviewGeneration} from '../scripts/smoke-preview-ai.mjs';
const result=()=>({provider:'cloudflare',draft:{businessName:'Forge Verification Studio',industry:'Design',description:'An independent studio providing thoughtful website design services.',services:['Website design','Accessibility review']},pages:['index','services','about','contact'].map(slug=>({slug,html:'<!doctype html><html lang="en"><head><title>Studio</title></head><body><h1>Studio</h1></body></html>'}))});
test('requires Cloudflare provider, verified identity, and every generated page',()=>{
 assert.equal(validatePreviewGeneration(result()),true);
 for(const modify of [r=>r.provider='fixture',r=>r.draft.businessName='Other',r=>r.draft.industry='Other',r=>r.draft.services=[],r=>r.draft.description='short',r=>r.pages.pop(),r=>r.pages[3].slug='index',r=>r.pages[2].html='<p>broken</p>']){
  const r=result();modify(r);assert.throws(()=>validatePreviewGeneration(r));
 }
});
test('performs one live generation request with matching origin and no retry loop',async()=>{
 let count=0;
 await smokePreviewAi('https://preview.example',async(url,options)=>{
  count++;assert.equal(url.pathname,'/api/ai/business');assert.equal(options.headers.Origin,'https://preview.example');assert.equal(JSON.parse(options.body).businessName,'Forge Verification Studio');
  return Response.json(result());
 });
 assert.equal(count,1);
});
test('rejects failed inference without reading or logging provider response contents',async()=>{
 await assert.rejects(smokePreviewAi('https://preview.example',async()=>new Response('sensitive response',{status:503})),/HTTP 503/);
});
test('rejects credential-bearing or non-origin deployment URLs before requesting',async()=>{
 for(const base of ['http://example.com','https://user:password@example.com','https://example.com/path']){
  await assert.rejects(smokePreviewAi(base,async()=>{throw Error('must not fetch')}),/HTTPS preview origin/);
 }
});
