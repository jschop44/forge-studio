import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {enrichGeneratedBusinessPages} from '../src/lib/premium-page-composition';
import {photoIdentity} from '../src/lib/industry-photos';
import {inspectGeneratedPages} from '../src/lib/auto-correction';

const images=(html:string)=>[...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map(x=>x[1]);
// Thumbnail selectors intentionally preview the same asset as the WebGL scene;
// assess repeated *editorial* imagery without counting the scene's controls.
const editorialImages=(html:string)=>images(html.replace(/<div class="world-gallery-strip"[\s\S]*?<\/div>/g,''));
const brief=(industry:string)=>({
 businessName:'Fruit stand fresh',industry,
 description:'Fruit stand fresh offers a variety of locally grown fruit and fruit baskets for customers to browse and inquire about availability.',
 services:['Locally grown fruit','Fruit baskets'],experienceStyle:'standard' as const
});

test('real fruit stand website includes a professional multi-photo composition on each page',()=>{
 const site=generateBusinessWebsite(brief('Fresh produce retail'));
 assert.deepEqual(site.pages.map(page=>page.slug),['index','services','about','contact']);
 for(const page of site.pages){
  const photos=images(page.html).map(photoIdentity);
  assert.ok(photos.length>=3,page.slug+' needs multiple meaningful photographs, not one image');
  assert.equal(photos.length,new Set(photos).size,page.slug+' has duplicated pictures');
  assert.match(page.html,/<section class="forge-editorial"/,page.slug);
  assert.match(page.html,/class="forge-editorial__gallery"/,page.slug);
  assert.match(page.html,/id="forge-premium-editorial-styles"/,page.slug);
  assert.match(page.html,/@media\(max-width:760px\)/,page.slug);
  assert.match(page.html,/href="(?:index|services|about|contact)\.html"/);
 }
 const products=site.pages.find(page=>page.slug==='services')!.html;
 assert.match(products,/<article id="offering-0"[^>]*>[\s\S]*?class="service-photo"/);
 assert.match(products,/<article id="offering-1"[^>]*>[\s\S]*?class="service-photo"/);
 assert.deepEqual(inspectGeneratedPages(site.pages),[]);
});

test('coffee, restaurants, baseball and immersive fruit each get varied images across the site',()=>{
 const niches=[
  ['Coffee shop',['Espresso drinks','Whole bean coffee','Fresh pastries']],
  ['Restaurant',['Pizza','Private dining']],
  ['Baseball equipment store',['Baseball gloves','Baseballs']],
  ['Fresh produce retail',['Seasonal fruit','Fruit baskets']]
 ] as const;
 for(const [industry,services] of niches){
  for(const experienceStyle of ['standard','immersive'] as const){
   const site=generateBusinessWebsite({businessName:'Northstar Market',industry,description:'Local business offering products and services for shoppers in the area.',services:[...services],experienceStyle});
   for(const page of site.pages){
    const urls=editorialImages(page.html).map(photoIdentity);
    assert.ok(urls.length>=3,industry+' '+experienceStyle+' '+page.slug+' should show 3+ photos');
    assert.equal(new Set(urls).size,urls.length,industry+' '+experienceStyle+' '+page.slug+' duplicates a photo');
    if(experienceStyle==='immersive')assert.match(page.html,/forge-immersive-world/,industry);
   }
  }
 }
});

test('unknown niches use supplied licensed images without fabricating unrelated stock',()=>{
 const input={businessName:'Craft & Keys',industry:'Piano tuning',
  description:'Independent piano tuning and instrument maintenance appointments for local customers.',
  services:['Piano tuning'],experienceStyle:'standard' as const};
 const noRights=generateBusinessWebsite(input);
 assert.ok(noRights.pages.every(page=>images(page.html).length===0));
 const assets=Array.from({length:6},(_,index)=>({
  url:'https://upload.wikimedia.org/wikipedia/commons/a/aa/piano-tuning-'+index+'.jpg',
  title:'Piano tuning detail '+index,source:'https://commons.wikimedia.org/wiki/File:Piano_tuning_'+index+'.jpg',
  credit:'Public domain artist',license:'CC0'
 }));
 const result=generateBusinessWebsite({...input,visualAssets:assets});
 assert.ok(result.pages.every(page=>images(page.html).length>=3));
 assert.ok(result.pages.every(page=>images(page.html).every(src=>src.includes('piano-tuning'))));
});

test('editorial augmentation is idempotent and does not mutate original pages',()=>{
 const pages=generateBusinessWebsite(brief('Fresh produce retail')).pages;
 const updated=enrichGeneratedBusinessPages(pages,brief('Fresh produce retail'));
 assert.deepEqual(updated,pages);
});

test('editorial galleries prioritize different licensed photos across the entire four-page site',()=>{
 const visualAssets=Array.from({length:13},(_,index)=>({
  url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/piano-tuning-gallery-'+index+'.jpg',
  title:'Piano tuning technician service gallery '+index,credit:'Photographer',
  source:'https://commons.wikimedia.org/wiki/File:Piano_tuning_gallery_'+index+'.jpg',license:'CC0'
 }));
 const pages=['index','services','about','contact'].map(slug=>({
  slug,title:'Piano tuning',html:'<!doctype html><html><head><title>Piano tuning</title></head><body><main><h1>Piano tuning</h1>'+
   (slug==='index'?'<img src="'+visualAssets[0].url+'" alt="Piano tuning detail">':'')+'</main></body></html>'
 }));
 const result=enrichGeneratedBusinessPages(pages,{
  businessName:'Piano Care',industry:'Piano tuning',
  description:'An independent local piano tuning and maintenance service.',
  services:['Piano tuning'],visualAssets
 });
 const galleryPhotos=result.flatMap(page=>[...page.html.matchAll(/class="forge-editorial__photo"[\s\S]*?<img src="([^"]+)"/g)].map(match=>photoIdentity(match[1])));
 assert.ok(result.every(page=>page.html.includes('class="forge-editorial"')),'every page gets an editorial gallery');
 assert.equal(galleryPhotos.length,12,'four pages each receive three relevant photos');
 assert.equal(new Set(galleryPhotos).size,12,'use unused licensed artwork before repeating gallery photos');
 assert.ok(!galleryPhotos.includes(photoIdentity(visualAssets[0].url)),'an existing hero is never repeated in another page gallery');
 assert.deepEqual(enrichGeneratedBusinessPages(result,{
  businessName:'Piano Care',industry:'Piano tuning',description:'An independent local piano tuning and maintenance service.',
  services:['Piano tuning'],visualAssets
 }),result,'second pass never inserts duplicate galleries');
});

test('inert data-src and data-srcset do not suppress working editorial photography',()=>{
 const licensed={
  url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/piano-tuning-lazy.jpg',
  title:'Piano tuning technician adjusting instrument',credit:'Photographer',
  source:'https://commons.wikimedia.org/wiki/File:Piano_tuning_lazy.jpg',license:'CC0'
 };
 const brief={businessName:'Piano Care',industry:'Piano tuning',
  description:'Piano tuning and maintenance services for local musicians.',
  services:['Piano tuning'],visualAssets:[licensed]};
 for(const attribute of ['data-src','data-srcset']){
  const page={slug:'index',title:'Piano tuning',html:
   '<html><head></head><body><main><h1>Piano tuning</h1><img '+attribute+'="'+licensed.url+'" alt="Not activated by static export"></main></body></html>'};
  const output=enrichGeneratedBusinessPages([page],brief)[0].html;
  assert.match(output,/class="forge-editorial__photo"/);
  assert.match(output,/class="forge-editorial__photo"[\s\S]*?<img src="https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/a\/ab\/piano-tuning-lazy\.jpg"/);
 }
});

test('real source srcset reserves its photo rather than duplicating it in a gallery',()=>{
 const assets=[0,1,2].map(index=>({
  url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/piano-tuning-srcset-'+index+'.jpg',
  title:'Piano tuning workshop '+index,credit:'Photographer',
  source:'https://commons.wikimedia.org/wiki/File:Piano_tuning_srcset_'+index+'.jpg',license:'CC0'
 }));
 const page={slug:'index',title:'Piano tuning',html:
  '<html><head></head><body><main><h1>Piano tuning</h1><picture><source srcset="'+assets[0].url+' 1000w"><img src="/fallback.jpg"></picture></main></body></html>'};
 const output=enrichGeneratedBusinessPages([page],{
  businessName:'Piano Care',industry:'Piano tuning',
  description:'Local instrument repair and tuning.',services:['Piano tuning'],visualAssets:assets
 })[0].html;
 assert.match(output,/class="forge-editorial__photo"/);
 const gallery=output.split('class="forge-editorial"')[1]||'';
 assert.doesNotMatch(gallery,/piano-tuning-srcset-0\.jpg/,'a real responsive image is reserved');
});
