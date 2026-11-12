import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverBusinessVisualsForOfferings} from '../src/lib/server/business-visuals';
import {discoverOpenverseVisuals} from '../src/lib/server/openverse-visuals';
import {industryPhotos,servicePhoto} from '../src/lib/industry-photos';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {ensurePagePhotography} from '../src/lib/ensure-page-photography';

test('fruit stand and fresh produce have an immediate, four-page no-key image fallback',()=>{
 for(const niche of ['Fruit stand fresh','Fresh produce retail','Farmers market produce']){
  const photos=industryPhotos(niche);
  assert.ok(photos.length>=4,niche);
  assert.equal(new Set(photos).size,photos.length,niche);
  const site=generateBusinessWebsite({businessName:'Fruit stand fresh',industry:niche,description:'Locally grown fruit and handcrafted fruit baskets for shoppers.',services:['Locally grown fruit','Fruit baskets'],experienceStyle:'standard'});
  for(const page of site.pages)assert.match(page.html,/<img\b[^>]*src="https:\/\/images\.unsplash\.com\/photo-/);
 }
 assert.ok(servicePhoto('Fruit baskets','Fresh produce retail')?.includes('photo-1773823307113'));
 assert.deepEqual(industryPhotos('Custom aerospace testing'),[]);
});

const sample=(index:number)=>({
 url:'https://live.staticflickr.com/1234/piano-'+index+'.jpg',
 foreign_landing_url:'https://www.flickr.com/photos/owner/'+index+'/',
 title:'Piano tuning technician at work '+index,
 license:'cc0',creator:'Photographer',category:'photograph',filetype:'jpg',
 width:3600,height:2400,mature:false,tags:[{name:'piano'},{name:'tuning'}]
});

test('Openverse anonymously finds licensed photographic niche images without a curated topic',async()=>{
 const requests:string[]=[];
 const mock=(async(input:RequestInfo|URL)=>{
  const url=new URL(String(input));requests.push(url.hostname);
  if(url.hostname==='commons.wikimedia.org')return new Response(JSON.stringify({query:{pages:{}}}));
  assert.equal(url.hostname,'api.openverse.org');
  assert.equal(url.searchParams.get('license'),'cc0,pdm');
  assert.equal(url.searchParams.get('mature'),'false');
  return new Response(JSON.stringify({results:[
   ...Array.from({length:5},(_,i)=>sample(i)),
   {...sample(11),license:'by'},
   {...sample(12),title:'Unrelated gardening landscape',tags:[{name:'garden'}]},
   {...sample(13),url:'https://unapproved.example.com/tracker.jpg'},
   {...sample(14),width:500},
   {...sample(15),mature:true}
  ]}));
 }) as typeof fetch;
 const verified=await discoverBusinessVisualsForOfferings('Piano tuning',['Piano tuning'],mock);
 assert.equal(verified.length,5);
 assert.ok(verified.every(photo=>photo.license==='CC0'));
 assert.ok(requests.includes('api.openverse.org'));
 const pages=['index','services','about','contact'].map(slug=>({slug,title:slug,html:'<html><body><main><h1>'+slug+'</h1></main></body></html>'}));
 const repaired=ensurePagePhotography(pages,'Piano tuning',verified,['Piano tuning']);
 const img=repaired.map(page=>page.html.match(/<img src="([^"]+)"/)?.[1]);
 assert.ok(img.every(Boolean));
 assert.equal(new Set(img).size,4);
});

test('Openverse filters out images without source license, subject and image-quality evidence',async()=>{
 const mock=(async()=>new Response(JSON.stringify({results:[
  {...sample(0),license:'by-sa'},
  {...sample(1),title:'Coffee table',tags:[{name:'coffee'}]},
  {...sample(2),url:'https://malicious.example/photo.jpg'},
  {...sample(3),foreign_landing_url:'https://unknown.example/photo'},
  {...sample(4),category:'illustration'},
  {...sample(5),height:400}
 ]}))) as typeof fetch;
 assert.deepEqual(await discoverOpenverseVisuals('Piano tuning',mock),[]);
});
