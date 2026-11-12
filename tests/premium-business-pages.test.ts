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
