import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewWithBrowserWorker} from '../src/lib/server/browser-quality-worker';
const pages=[{slug:'index',title:'Shop',html:'<title>Shop</title><img alt="Product" src="data:image/png;base64,AA">'}];
test('optional browser worker is explicit and preserves pages when unconfigured',async()=>{
 const original=process.env.FORGE_QUALITY_WORKER_URL;delete process.env.FORGE_QUALITY_WORKER_URL;
 try{const result=await reviewWithBrowserWorker(pages);assert.equal(result.browserReview.status,'not-configured');assert.deepEqual(result.pages,pages)}finally{if(original)process.env.FORGE_QUALITY_WORKER_URL=original}
});
test('worker result cannot delete or rename pages or falsely pass findings',async()=>{
 const original=globalThis.fetch,endpoint=process.env.FORGE_QUALITY_WORKER_URL,secret=process.env.FORGE_QUALITY_WORKER_SECRET;
 process.env.FORGE_QUALITY_WORKER_URL='https://quality.example/review';process.env.FORGE_QUALITY_WORKER_SECRET='secret';
 try{
  for(const result of [{pages:[],passed:true,attempts:0,findings:[]},{pages:[{...pages[0],slug:'other'}],passed:true,attempts:1,findings:[]},{pages,passed:true,attempts:1,findings:[{slug:'index',kind:'broken-image',detail:'Photo'}]}]){
   globalThis.fetch=async()=>new Response(JSON.stringify(result));
   assert.equal((await reviewWithBrowserWorker(pages)).browserReview.status,'unavailable');
  }
  // A compromised or misconfigured optional worker must never rewrite executable
  // markup, business copy, navigation, or images under the guise of repair.
  for(const html of [pages[0].html+'<script>alert(1)</script>',pages[0].html.replace('Product','Unrelated'),pages[0].html.replace('Shop','Other')]){
   globalThis.fetch=async()=>Response.json({pages:[{...pages[0],html}],passed:true,attempts:1,findings:[]});
   assert.equal((await reviewWithBrowserWorker(pages)).browserReview.status,'unavailable');
  }
  const missingTitle=[{...pages[0],html:'<head></head><img alt="Product" src="data:image/png;base64,AA">'}];
  globalThis.fetch=async()=>Response.json({pages:[{...missingTitle[0],html:'<head><title>Shop</title></head><img alt="Product" src="data:image/png;base64,AA">'}],passed:true,attempts:1,findings:[]});
  assert.equal((await reviewWithBrowserWorker(missingTitle)).browserReview.status,'passed');
  globalThis.fetch=async()=>new Response(JSON.stringify({pages,passed:true,attempts:1,findings:[]}));
  assert.equal((await reviewWithBrowserWorker(pages)).browserReview.status,'passed');
 }finally{globalThis.fetch=original;for(const [name,value] of Object.entries({FORGE_QUALITY_WORKER_URL:endpoint,FORGE_QUALITY_WORKER_SECRET:secret})){if(value===undefined)delete process.env[name];else process.env[name]=value}}
});
