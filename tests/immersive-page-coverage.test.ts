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
   assert.match(page.html,page.slug==='index'?/id="forge-home-webgl-controller"/:/id="forge-spatial-controller"/,page.slug);
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
 it('restores position using a website-specific session key',()=>{
  for(const page of site.pages){
   assert.match(page.html,/const worldStorageKey=/,page.slug);
   assert.match(page.html,/sessionStorage\.getItem\(worldStorageKey\)/,page.slug);
   assert.match(page.html,/sessionStorage\.setItem\(worldStorageKey,/,page.slug);
   assert.match(page.html,/Number\.isFinite\(value\)/,page.slug);
  }
 });
 it('provides a keyboard-accessible reset control for spatial navigation',()=>{
  for(const page of site.pages){
   assert.match(page.html,/Reset immersive world position to start/,page.slug);
   assert.match(page.html,/sessionStorage\.removeItem\(worldStorageKey\)/,page.slug);
  }
 });
 it('includes reduced-motion-aware internal page transitions',()=>{
  for(const page of site.pages){
   assert.match(page.html,/forge-world-departing/,page.slug);
   assert.match(page.html,/destination\.origin!==location\.origin/,page.slug);
   assert.match(page.html,/reduced\.matches/,page.slug);
   assert.match(page.html,/pageshow/,page.slug);
  }
 });
 it('preserves camera perspective and zoom across page navigation',()=>{
  for(const page of site.pages){
   assert.match(page.html,/cameraStorageKey=worldStorageKey\+':camera'/,page.slug);
   assert.match(page.html,/sessionStorage\.getItem\(cameraStorageKey\)/,page.slug);
   assert.match(page.html,/addEventListener\('pagehide',saveCamera\)/,page.slug);
   assert.match(page.html,/resetPosition\.addEventListener\('click'/,page.slug);
  }
 });
 it('does not duplicate immersive scripts when enhancement is repeated',()=>{
  const again=enhanceImmersivePages(site.pages);
  for(const page of again){
   assert.equal((page.html.match(/id="forge-spatial-controller"|id="forge-home-webgl-controller"/g)||[]).length,1,page.slug);
  }
 });
});
