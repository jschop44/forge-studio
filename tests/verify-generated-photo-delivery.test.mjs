import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPhotoUrl,collectPhotoUrls,verifyGeneratedPhotoDelivery} from '../scripts/verify-generated-photo-delivery.mjs';

const page=urls=>({slug:'index',html:'<html><main>'+urls.map(src=>'<img src="'+src+'" alt="subject">').join('')+'</main></html>'});
const urls=Array.from({length:6},(_,index)=>'https://images.unsplash.com/photo-1000'+index+'?auto=format&amp;w=1600');

test('deduplicates generated page photography, decodes HTML entities, rejects arbitrary hosts',()=>{
 const payloads=[{pages:[page([urls[0],urls[0].replace('1600','2200'),urls[1],'https://tracker.example/pixel.jpg'])]},{
  pages:[page([urls[2],'data:image/svg+xml,%3Csvg%3E',urls[3]])]
 }];
 const actual=collectPhotoUrls(payloads);
 assert.equal(actual.length,4);
 assert.equal(actual[0],'https://images.unsplash.com/photo-10000?auto=format&w=1600');
 assert.equal(actual.some(url=>url.includes('tracker.example')),false);
});

test('a real image response succeeds and an HTML response never passes',async()=>{
 const ok=await checkPhotoUrl(urls[0],async()=>new Response(null,{status:200,headers:{'content-type':'image/jpeg'}}));
 assert.equal(ok.ok,true);
 const bad=await checkPhotoUrl(urls[1],async()=>new Response('<html>Not found</html>',{status:200,headers:{'content-type':'text/html'}}));
 assert.equal(bad.ok,false);
 assert.match(bad.reason,/text\/html/);
});

test('GET range fallback handles hosts that block HEAD',async()=>{
 const methods=[];
 const result=await checkPhotoUrl(urls[0],async(_url,init)=>{
  methods.push(init.method);
  return new Response(null,{status:init.method==='HEAD'?405:206,headers:{'content-type':init.method==='HEAD'?'text/html':'image/webp'}});
 });
 assert.equal(result.ok,true);
 assert.deepEqual(methods,['HEAD','GET']);
});

test('deployment verification rejects dead images even if all pages have img tags',async()=>{
 const payloads=[{pages:[page(urls.slice(0,3))]},{pages:[page(urls.slice(3))]}];
 const checked=await verifyGeneratedPhotoDelivery(payloads,async input=>{
  const unreachable=String(input).includes('photo-10003');
  return new Response(null,{status:unreachable?404:200,headers:{'content-type':unreachable?'text/plain':'image/jpeg'}});
 });
 assert.equal(checked.checked,6);
 assert.equal(checked.passed,5);
 assert.equal(checked.failed.length,1);
 assert.match(checked.failed[0].url,/photo-10003/);
});
