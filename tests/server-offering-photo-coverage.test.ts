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
