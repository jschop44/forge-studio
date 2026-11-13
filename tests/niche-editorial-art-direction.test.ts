import {test} from 'node:test';
import assert from 'node:assert/strict';
import {businessArtDirection} from '../src/lib/business-art-direction';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {inspectGeneratedPages} from '../src/lib/auto-correction';

const businesses=[
 {businessName:'Fruit stand fresh',industry:'Fresh produce retail',description:'Locally grown fruit, seasonal produce and fruit baskets for customers to browse and ask about.',services:['Locally grown fruit','Fruit baskets'],theme:'produce',home:'Fresh finds, in focus.',servicesHeading:'Explore the selection.'},
 {businessName:'Baker Street Books',industry:'Independent bookshop',description:'A neighborhood shop selling new books, reading materials and stationery for visitors.',services:['New books','Stationery'],theme:'books',home:'Explore the collection.',servicesHeading:'Discover what’s available.'},
 {businessName:'Meridian Piano',industry:'Piano tuning',description:'An independent technician providing piano tuning, maintenance and consultation services.',services:['Piano tuning','Maintenance'],theme:'music',home:'Explore the sound of the work.',servicesHeading:'Find the right service.'},
 {businessName:'Seabright Marine',industry:'Marine electronics',description:'Marine electronics installations and equipment consultations for boat owners and operators.',services:['Marine navigation','Electronics installation'],theme:'marine',home:'Explore life on the water.',servicesHeading:'See what’s available.'},
 {businessName:'Clay & Glaze',industry:'Artisan pottery',description:'Handmade pottery, ceramic goods and small-batch studio creations available for customers.',services:['Handmade pottery','Ceramic mugs'],theme:'artisan',home:'A closer look at the craft.',servicesHeading:'Explore the collection.'},
] as const;

test('business identity selects a palette and story for actual niche, not generic office',()=>{
 for(const entry of businesses){
  const direction=businessArtDirection(entry.industry,entry.businessName);
  assert.equal(direction.key,entry.theme,entry.industry);
  assert.match(direction.paper,/^#[a-f0-9]{6}$/i);
  assert.match(direction.ink,/^#[a-f0-9]{6}$/i);
 }
});

test('each page uses purposeful, distinct niche-specific headings and matching editorial theme',()=>{
 for(const entry of businesses){
  const site=generateBusinessWebsite({...entry,experienceStyle:'standard'});
  assert.deepEqual(site.pages.map(page=>page.slug),['index','services','about','contact']);
  assert.deepEqual(inspectGeneratedPages(site.pages),[],entry.industry);
  const headings:string[]=[];
  for(const page of site.pages){
   const html=page.html;
   assert.match(html,new RegExp('data-editorial-theme="'+entry.theme+'"'),page.slug);
   assert.match(html,new RegExp('data-forge-business="'+entry.theme+'"'),page.slug);
   assert.match(html,/<style id="forge-premium-editorial-styles">/);
   const h=html.match(/<section class="forge-editorial"[^>]*>[\s\S]*?<h2>(.*?)<\/h2>/)?.[1];
   assert.ok(h,page.slug+' missing editorial heading');
   headings.push(h);
   assert.doesNotMatch(html,/Behind the details|A closer look<\/figcaption>|Closer to what matters\./);
  }
  assert.equal(new Set(headings).size,4,entry.industry+' repeats page headings');
  assert.equal(headings[0],entry.home);
  assert.equal(headings[1],entry.servicesHeading);
 }
});

test('fruit stand has market-specific art direction plus fully responsive photo layouts',()=>{
 const site=generateBusinessWebsite({...businesses[0],experienceStyle:'standard'});
 for(const page of site.pages){
  assert.match(page.html,/body\[data-forge-business="produce"\]\[data-forge-experience="standard"\] \.site-hero/);
  assert.match(page.html,/radial-gradient\(ellipse at 92% 7%/);
  assert.match(page.html,/forge-editorial__gallery/);
  assert.match(page.html,/@media\(max-width:760px\)/);
  assert.ok((page.html.match(/<img\b/g)||[]).length>=3,page.slug+' must contain multiple photos');
 }
});

test('editorial content never adds fabricated contact details, prices or guarantees',()=>{
 const site=generateBusinessWebsite({...businesses[0],experienceStyle:'standard'});
 for(const page of site.pages){
  const section=page.html.match(/<section class="forge-editorial"[\s\S]*?<\/section>/)?.[0]||'';
  assert.ok(section,'missing photo story');
  assert.doesNotMatch(section,/\$\d+|\b100% guaranteed\b|\b5 stars\b|\bwe grow every fruit\b/i);
 }
});
