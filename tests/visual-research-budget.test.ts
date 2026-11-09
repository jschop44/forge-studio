import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverBusinessVisuals} from '../src/lib/server/business-visuals';
import {relevantVisualAssets} from '../src/lib/visual-assets';
const asset=(title:string)=>({url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/'+title.replace(/ /g,'_')+'.jpg',title,credit:'Photographer',source:'https://commons.wikimedia.org/wiki/File:Example.jpg',license:'CC BY 4.0'});
function response(width=4800,height=3200){return new Response(JSON.stringify({query:{pages:{1:{title:'File:Japanese restaurant interior',imageinfo:[{mime:'image/jpeg',width,height,url:asset('Japanese restaurant interior').url,descriptionurl:asset('x').source,extmetadata:{LicenseShortName:{value:'CC BY 4.0'},Artist:{value:'Photographer'}}}]}}}}))}

test('every specific niche term needs image evidence, including unfamiliar combinations',()=>{
 for(const [niche,right,wrong] of [
  ['Animal hospital','Animal hospital interior','Human hospital interior'],
  ['Animal hospitals','Animal hospital interior','Human hospital interior'],
  ['Japanese restaurant','Japanese restaurant interior','Italian restaurant interior'],
  ['Marine robotics','Marine robotics laboratory','Industrial robotics laboratory'],
  ['Ceramic restoration','Ceramic restoration workshop','Ceramic kitchen showroom']
 ])assert.deepEqual(relevantVisualAssets(niche,[asset(wrong),asset(right)]),[asset(right)],niche);
});

test('concurrent identical searches share one request and callers cannot mutate cached evidence',async()=>{
 let finish!:()=>void,calls=0;
 const fetcher:typeof fetch=async()=>{calls++;await new Promise<void>(resolve=>{finish=resolve});return response()};
 const searches=Array.from({length:20},()=>discoverBusinessVisuals('Japanese restaurant',fetcher));
 assert.equal(calls,1);finish();const results=await Promise.all(searches);
 assert.ok(results.every(assets=>assets.length===1));results[0][0].title='Unrelated office';results[1].length=0;
 assert.equal((await discoverBusinessVisuals('Japanese restaurant',fetcher))[0].title,'Japanese restaurant interior');
 assert.equal(calls,1);
});

test('native dimensions are required; low-resolution sources cannot masquerade as 4K thumbnails',async()=>{
 for(const [width,height,expected] of [[1920,1080,0],[0,0,0],[3840,2160,1],[2160,3840,1]]){
  const assets=await discoverBusinessVisuals('Japanese restaurant',async()=>response(width,height));
  assert.equal(assets.length,expected,width+'x'+height);
 }
});

test('arbitrary niche searches retain their subject rather than switching to a broad medical query',async()=>{
 await discoverBusinessVisuals('Animal hospital',async input=>{
  const url=new URL(String(input));assert.ok(url.searchParams.get('gsrsearch')?.startsWith('animal hospital '));
  assert.ok(url.searchParams.get('iiprop')?.includes('size'));return new Response('{}');
 });
});

test('external work is bounded and failures have a short shared cooldown',async()=>{
 const releases:(()=>void)[]=[];let calls=0;
 const fetcher:typeof fetch=async()=>{calls++;await new Promise<void>(r=>releases.push(r));return new Response('',{status:503})};
 const pending=['Marine robotics','Ceramic restoration','Animal hospital','Japanese restaurant'].map(n=>discoverBusinessVisuals(n,fetcher));
 assert.deepEqual(await discoverBusinessVisuals('Solar engineering',fetcher),[]);assert.equal(calls,4);
 releases.forEach(r=>r());await Promise.all(pending);
 assert.deepEqual(await discoverBusinessVisuals('Marine robotics',fetcher),[]);assert.equal(calls,4);
});

test('oversized metadata streams are cancelled before consuming the entire response',{timeout:1000},async()=>{
 let cancelled=false;
 const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(300001))},cancel(){cancelled=true}});
 assert.deepEqual(await discoverBusinessVisuals('Streamed niche',async()=>new Response(body)),[]);
 assert.equal(cancelled,true);
});
