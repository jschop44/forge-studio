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
 it('keeps stock imagery disabled for sensitive subjects',()=>{
  assert.deepEqual(industryPhotos('horror attraction'),[]);
  assert.equal(servicePhoto('weapon sales','retail'),null);
 });
 it('keeps all curated category images unique within each category',()=>{
  for(const [category,ids] of Object.entries(photoLibrary))assert.equal(new Set(ids).size,ids.length,category);
 });
});
