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
  for(const [offering,industry] of [['Hotel suites','Hospitality'],['Fitness training','Fitness'],['Software development','Technology'],['Fashion clothing','Fashion'],['Private dining','Restaurant']]){
   assert.ok(servicePhoto(offering,industry)?.startsWith('https://images.unsplash.com/photo-'),offering);
  }
 });
 it('keeps stock imagery disabled for sensitive subjects',()=>{
  assert.deepEqual(industryPhotos('horror attraction'),[]);
  assert.equal(servicePhoto('weapon sales','retail'),null);
 });
 it('provides four candidates for every curated business category',()=>{for(const [category,ids] of Object.entries(photoLibrary))assert.ok(ids.length>=4,category+' needs at least four alternatives')});
 it('does not mistake healthcare for automotive',()=>{const healthcare=industryPhotos('healthcare clinic');const automotive=industryPhotos('automotive dealership');assert.notDeepEqual(healthcare,automotive);assert.deepEqual(automotive,photoLibrary.automotive.map(id=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=1400&q=80'))});
 it('keeps all curated category images unique within each category',()=>{
  for(const [category,ids] of Object.entries(photoLibrary))assert.equal(new Set(ids).size,ids.length,category);
 });
});
