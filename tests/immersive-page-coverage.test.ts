import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {enhanceImmersivePages} from '../src/lib/immersive-showcase';

describe('Generated website immersive navigation coverage',()=>{
 const site=generateBusinessWebsite({
  businessName:'Cedar Studio',
  industry:'Design',
  description:'A creative studio building accessible websites for neighborhood businesses.',
  services:['Website design','Brand identity']
 });
 it('adds the immersive WebGL layer to every generated page',()=>{
  assert.equal(site.pages.length,4);
  for(const page of site.pages){
   assert.match(page.html,/id="forge-spatial-controller"/,page.slug);
   assert.match(page.html,/forge-webgl-atmosphere/,page.slug);
   assert.match(page.html,/forge-world-beacon-link/,page.slug);
   assert.match(page.html,/Immersive world movement/,page.slug);
  }
 });
 it('keeps links to services, about and contact available on every page',()=>{
  for(const page of site.pages){
   for(const href of ['services.html','about.html','contact.html']){
    assert.ok(page.html.includes(href),page.slug+' missing '+href);
   }
  }
 });
 it('does not duplicate immersive scripts when enhancement is repeated',()=>{
  const again=enhanceImmersivePages(site.pages);
  for(const page of again){
   assert.equal((page.html.match(/id="forge-spatial-controller"/g)||[]).length,1,page.slug);
  }
 });
});
