import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {industryPhotos,servicePhoto,photoLibrary} from '../src/lib/industry-photos';

describe('business-specific image diversity',()=>{
 it('provides distinct coffee and restaurant images without duplicating hero assets',()=>{
  for(const industry of ['coffee shop','restaurant']){
   const images=industryPhotos(industry);
   assert.ok(images.length>=4,industry+' should have multiple relevant image options');
   assert.equal(new Set(images).size,images.length,industry+' must not repeat the same image');
  }
 });
 it('uses different photos for coffee beans, espresso and pastries',()=>{
  const images=['Whole bean coffee','Espresso drinks','Fresh pastries'].map(service=>servicePhoto(service,'Coffee shop'));
  assert.ok(images.every(Boolean));
  assert.equal(new Set(images).size,images.length);
 });
 it('selects relevant imagery for additional business niches',()=>{
  for(const [offering,industry] of [['Hotel suites','Hospitality'],['Fashion clothing','Fashion'],['Private dining','Restaurant']]){
   assert.ok(servicePhoto(offering,industry)?.startsWith('https://images.unsplash.com/photo-'),offering);
  }
 });
 it('keeps stock imagery disabled for sensitive subjects',()=>{
  assert.deepEqual(industryPhotos('horror attraction'),[]);
  assert.equal(servicePhoto('weapon sales','retail'),null);
 });
 it('provides multiple audited candidates for every curated business category',()=>{for(const [category,ids] of Object.entries(photoLibrary))assert.ok(ids.length>=3,category+' needs multiple alternatives')});
 it('does not mistake healthcare for automotive',()=>{const healthcare=industryPhotos('healthcare clinic');const automotive=industryPhotos('automotive dealership');assert.notDeepEqual(healthcare,automotive);assert.deepEqual(automotive,photoLibrary.automotive.map(id=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=3840&q=90'))});
 it('does not use coffee imagery for a baseball business',()=>{const baseball=industryPhotos('baseball equipment store');const coffee=industryPhotos('coffee shop');assert.ok(baseball.length>=4);assert.equal(baseball.some(image=>coffee.includes(image)),false)});
 it('does not classify a hair salon as a technology business',()=>{assert.deepEqual(industryPhotos('hair salon and beauty studio'),photoLibrary.beauty.map(id=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=3840&q=90'))});
 it('does not use hotel photography for unrelated bathroom design',()=>{assert.equal(servicePhoto('Bathroom design','Interior design'),null);assert.ok(servicePhoto('Hotel suites','Hospitality'))});
 it('keeps all curated category images unique within each category',()=>{
  for(const [category,ids] of Object.entries(photoLibrary))assert.equal(new Set(ids).size,ids.length,category);
 });
});

import {photoIdentity,selectDiversePhoto} from '../src/lib/industry-photos';
it('does not count alternate crops of the same asset as different photos',()=>{
 const used=new Set<string>();const first='https://images.unsplash.com/photo-one?w=1000';
 assert.equal(selectDiversePhoto([first],used),first);
 assert.equal(selectDiversePhoto(['https://images.unsplash.com/photo-one?w=1400','https://images.unsplash.com/photo-two?w=1000'],used),'https://images.unsplash.com/photo-two?w=1000');
 assert.equal(selectDiversePhoto([first],used),undefined);
 assert.equal(photoIdentity(first),'https://images.unsplash.com/photo-one');
});

it('ambiguous offering words cannot switch the business niche',()=>{
 assert.ok(servicePhoto('Soccer training','Soccer club')?.includes('photo-1517466787929'));assert.notEqual(servicePhoto('Soccer training','Soccer club'),servicePhoto('Fitness training','Fitness'));
 assert.equal(servicePhoto('Sales training','Education'),null);
 assert.equal(servicePhoto('Surgical gloves','Healthcare'),null);
 assert.equal(servicePhoto('Examination rooms','Dental practice'),null);
 assert.equal(servicePhoto('Software suite','Technology'),null);
 assert.equal(servicePhoto('Home visits','Healthcare'),null);
 assert.equal(servicePhoto('Roast chicken','Restaurant'),null);
});

import {offeringPhotoCandidates} from '../src/lib/industry-photos';
import {generateBusinessWebsite} from '../src/lib/business-site';
it('never rotates a salad into a pizza restaurant page or unrelated stock into wings',()=>{
 const result=generateBusinessWebsite({experienceStyle:'standard',businessName:'Pizza and Wings',industry:'Restaurant and hospitality',description:'Pizza, chicken wings and pasta prepared for carryout.',services:['Pizza','Chicken wings','Pasta']});
 for(const page of result.pages)assert.equal(page.html.includes('photo-1512621776951-a57141f2eefd'),false);
 const menu=result.pages.find(page=>page.slug==='services')!.html;
 for(const index of [1,2]){
  const card=menu.match(new RegExp('<article id="offering-'+index+'"[\\s\\S]*?</article>'))![0];
  assert.equal(card.includes('service-photo'),false);
 }
 assert.deepEqual(offeringPhotoCandidates('Chicken wings','Restaurant'),[]);
 assert.ok(offeringPhotoCandidates('Pizza','Restaurant')[0].includes('photo-1513104890138'));
});
it('offering images cannot fall back to another product after exact imagery is exhausted',()=>{
 const used=new Set<string>();const candidates=offeringPhotoCandidates('Pizza','Restaurant');
 assert.ok(selectDiversePhoto(candidates,used));
 assert.equal(selectDiversePhoto(candidates,used),undefined);
});
