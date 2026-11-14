import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverBusinessVisualsForOfferings} from '../src/lib/server/business-visuals';
import {licensedBusinessVisualAssets,specificVisualOfferings} from '../src/lib/visual-assets';
import {ensurePagePhotography} from '../src/lib/ensure-page-photography';

const rawAsset=(title:string,license='CC0')=>({
 url:'https://upload.wikimedia.org/wikipedia/commons/a/aa/'+title.replace(/\s+/g,'-')+'.jpg',
 title,
 credit:'Creator',license,
 source:'https://commons.wikimedia.org/wiki/File:'+title.replace(/\s+/g,'_')+'.jpg'
});

test('server image research fetches each specific offering and filters unrelated/credited photos',async()=>{
 const old=process.env.PEXELS_API_KEY;
 delete process.env.PEXELS_API_KEY;
 const queried:string[]=[];
 const files:Record<string,{name:string;license:string}>={
  'chicken wings':{name:'Chicken wings on a plate',license:'CC0'},
  'pizza':{name:'Pizza on a wooden board',license:'CC0'},
  'restaurant':{name:'Restaurant dining area',license:'CC BY 4.0'}
 };
 const fetcher=(async(input:RequestInfo|URL)=>{
  const url=new URL(String(input));
  if(url.hostname==='api.openverse.org')return new Response(JSON.stringify({results:[]}));
  assert.equal(url.hostname,'commons.wikimedia.org');
  const search=(url.searchParams.get('gsrsearch')||'').split(' filetype:')[0].toLowerCase();
  queried.push(search);
  const result=files[search];
  const response=result?{query:{pages:{1:{
   title:'File:'+result.name+'.jpg',imageinfo:[{
    mime:'image/jpeg',width:4800,height:3000,
    thumburl:rawAsset(result.name).url,
    descriptionurl:rawAsset(result.name).source,
    extmetadata:{LicenseShortName:{value:result.license},Artist:{value:'Creator'}}
   }]
  }}}}:{query:{pages:{}}};
  return new Response(JSON.stringify(response));
 }) as typeof fetch;
 try{
  const results=await discoverBusinessVisualsForOfferings('Restaurant',['Chicken wings','Pizza','Contact team','Halloween attraction'],fetcher);
  assert.deepEqual(queried.sort(),['chicken wings','pizza','restaurant']);
  assert.equal(results.length,2);
  assert.ok(results.some(item=>item.title.includes('Chicken wings')));
  assert.ok(results.some(item=>item.title.includes('Pizza')));
  assert.ok(results.every(item=>item.license==='CC0'));
 }finally{if(old===undefined)delete process.env.PEXELS_API_KEY;else process.env.PEXELS_API_KEY=old}
});

test('skip unsafe and generic offering subjects when selecting free stock',()=>{
 assert.deepEqual(specificVisualOfferings(['Contact us','Book appointment','Halloween attraction','Spooky party','Chicken wings','Professional services']),['Chicken wings']);
});

test('server-side image coverage retains all original page IDs and inserts distinct photos',()=>{
 const pages=['index','services','about','contact'].map(slug=>({slug,title:slug,html:'<!doctype html><html><body><main><h1>'+slug+'</h1></main></body></html>'}));
 const photos=['Restaurant table','Restaurant interior','Restaurant dining','Restaurant dining room'].map(name=>rawAsset(name));
 const safe=licensedBusinessVisualAssets('Restaurant',[],photos);
 const result=ensurePagePhotography(pages,'Restaurant',safe);
 assert.deepEqual(result.map(page=>page.slug),pages.map(page=>page.slug));
 const html=result.map(page=>page.html);
 assert.ok(html.every(page=>page.includes('data-forge-auto-photo')));
 assert.equal(new Set(html.map(page=>page.match(/<img src="([^"]+)"/)?.[1])).size,4);
 assert.ok(html.every(page=>!page.includes('CC BY')));
});

test('one existing hero photo does not suppress precisely matched photos for empty offering cards',()=>{
 const page=(slug:string,body:string)=>({slug,title:slug,html:'<!doctype html><html><head></head><body><main>'+body+'</main></body></html>'});
 const hero='<figure><img src="https://images.unsplash.com/photo-1595574444306-e235cef5ea37" alt="Restaurant photography"></figure>';
 const cards='<div class="cards">'+
  '<article class="card service-card"><div class="service-copy"><h2>Chicken wings</h2><p>Fresh wings</p></div></article>'+
  '<article class="card service-card"><div class="service-copy"><h2>Pizza</h2><p>Fresh pizza</p></div></article>'+
  '<article class="card service-card"><div class="service-copy"><h2>Salads</h2><p>More options</p></div></article></div>';
 const pages=[page('index',hero+cards),page('services',hero+cards)];
 const images=[rawAsset('Chicken wings on a plate'),rawAsset('Pizza on a wooden board'),rawAsset('Fruit bowl')];
 const result=ensurePagePhotography(pages,'Restaurant',images,['Chicken wings','Pizza','Salads']);
 const catalog=result[1].html;
 assert.equal((catalog.match(/data-forge-verified-offering-photo/g)||[]).length,2);
 assert.match(catalog,/alt="Chicken wings"/);
 assert.match(catalog,/alt="Pizza"/);
 assert.doesNotMatch(catalog,/alt="Salads" loading/);
 assert.doesNotMatch(catalog,/Fruit-bowl/,'unrelated photo must not be mislabelled as a menu product');
 assert.ok(!result[0].html.includes('data-forge-verified-offering-photo'),'catalog receives scarce photos before home teasers');
 assert.equal(result[0].html.match(/<img\b/g)?.length,1,'original homepage photo remains untouched');
 assert.deepEqual(pages.map(p=>p.html.includes('data-forge-verified-offering-photo')), [false,false],'input is immutable');
 const again=ensurePagePhotography(result,'Restaurant',images,['Chicken wings','Pizza','Salads']);
 assert.deepEqual(again,result,'repeating repair does not duplicate media or rewrite existing cards');
});

test('offering photo repair refuses credited, unrelated, repeated or untrusted images',()=>{
 const card=(title:string,extra='')=>'<article class="card service-card">'+extra+'<div class="service-copy"><h2>'+title+'</h2></div></article>';
 const html='<html><body><main><img src="https://images.unsplash.com/photo-1513104890138-7c749659a591" alt="Existing hero">'+
  card('Chicken wings')+card('Pizza')+card('Ceramic mugs')+
  card('Chicken wings','<img class="service-photo" src="https://known.example/already.jpg">')+
  '<article class="card"><h2>Pizza</h2></article></main></body></html>';
 const candidates=[rawAsset('Chicken wings with sauce','CC BY 4.0'),
  rawAsset('Chicken salad with greens'),rawAsset('Pizza on a board'),
  {...rawAsset('Ceramic mugs'),url:'https://tracker.bad.example/ads.jpg'}];
 const fixed=ensurePagePhotography([{slug:'services',title:'Services',html}],'Restaurant',candidates,
  ['Chicken wings','Pizza','Ceramic mugs']);
 assert.equal((fixed[0].html.match(/data-forge-verified-offering-photo/g)||[]).length,1);
 assert.match(fixed[0].html,/src="https:\/\/known\.example\/already\.jpg"/);
 assert.match(fixed[0].html,/alt="Pizza"/);
 assert.doesNotMatch(fixed[0].html,/alt="Chicken wings" loading|tracker\.bad\.example|Chicken-salad/);
 assert.equal((fixed[0].html.match(/<article class="card"><h2>Pizza<\/h2><\/article>/g)||[]).length,1);
});

test('photo fallback never relabels visual subjects that cannot be verified or are unsafe',()=>{
 const html='<html><body><main><article class="card service-card">'+
  '<div class="service-copy"><h2>Halloween attraction</h2></div></article></main></body></html>';
 const page={slug:'services',title:'Services',html};
 const result=ensurePagePhotography([page],'Unknown performance venue',[rawAsset('Halloween attraction')],['Halloween attraction']);
 assert.equal((result[0].html.match(/<img\b/g)||[]).length,0);
 assert.doesNotMatch(result[0].html,/data-forge-verified-offering-photo/);
});
