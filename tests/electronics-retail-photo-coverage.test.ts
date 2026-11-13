import test from 'node:test';
import assert from 'node:assert/strict';
import {servicePhoto,offeringPhotoCandidates,photoIdentity} from '../src/lib/industry-photos';
import {generateBusinessWebsite} from '../src/lib/business-site';

const offerings=[
 'TV & Home Theater',
 'Computers & Tablets',
 'Headphones',
 'All Video Games',
 'Cameras, Camcorders & Drones',
 'Appliances'
];

test('electronics category tiles use six distinct real subject-matched Unsplash photos',()=>{
 const urls=offerings.map(name=>servicePhoto(name,'Electronics Retail'));
 assert.equal(urls.filter(Boolean).length,6);
 assert.equal(new Set(urls.map(url=>photoIdentity(url!))).size,6);
 for(const url of urls)assert.match(url!,/^https:\/\/images\.unsplash\.com\/photo-[a-z0-9-]+\?auto=format&fit=crop&w=3840&q=90$/);
});

test('specific retail photography does not invent Apple products or unrelated niches',()=>{
 for(const label of ['Apple','Apple Support','Drones','Software services','Smartphones']){
  assert.equal(servicePhoto(label,'Electronics Retail'),null,label);
 }
 for(const industry of ['AI consultancy','Coffee shop','Technology services','Restaurant','Family-friendly entertainment']){
  assert.equal(servicePhoto('Headphones',industry),null,industry);
 }
 assert.equal(offeringPhotoCandidates('Headphones','Electronics Retail').length,1);
});

test('generated electronics homepage offers photographic category coverage without wrong Apple imagery',()=>{
 const site=generateBusinessWebsite({
  businessName:'Example Electronics Store',industry:'Electronics Retail',
  description:'An electronics retailer with TVs, computers, headphones, video games, cameras and kitchen appliances.',
  services:['Apple',...offerings],experienceStyle:'standard'
 });
 const home=site.pages.find(page=>page.slug==='index');
 const catalog=site.pages.find(page=>page.slug==='services');
 assert.ok(home&&catalog);
 const cards=[...home.html.matchAll(/<article[^>]*class="card service-card"[^>]*>([\s\S]*?)<\/article>/g)].map(m=>m[1]);
 assert.equal(cards.length,7);
 assert.equal(cards.filter(card=>card.includes('class="service-photo"')).length,6);
 assert.ok(!cards[0].includes('class="service-photo"'),'Apple brand name cannot be illustrated by an unrelated generic item');
 const sources=cards.flatMap(card=>[...card.matchAll(/class="service-photo" src="([^"]+)"/g)].map(m=>m[1].split('?')[0]));
 assert.equal(new Set(sources).size,6,'photos do not repeat within the homepage');
 assert.ok(catalog.html.includes('TV &amp; Home Theater')||catalog.html.includes('TV & Home Theater'));
});
