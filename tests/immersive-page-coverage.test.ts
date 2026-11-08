import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
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
   assert.match(page.html,/destination\.pathname\.replace\(/,page.slug);
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
 it('generates syntactically valid inline JavaScript on every page',()=>{
  for(const page of site.pages){
   const scripts=[...page.html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
   assert.ok(scripts.length>0,page.slug+' has no inline scripts');
   for(const [,source] of scripts){
    assert.doesNotThrow(()=>new Script(source,{filename:page.slug+'.html'}),page.slug+' contains invalid JavaScript');
   }
  }
 });
 it('restores navigation when WebGL context is lost',()=>{
  for(const page of site.pages){
   assert.match(page.html,/webglcontextlost/,page.slug);
   assert.match(page.html,/portal\.link\.hidden=false/,page.slug);
   assert.match(page.html,/portal\.link\.tabIndex=0/,page.slug);
  }
 });
 it('registers exactly one transition handler per generated page',()=>{
  for(const page of site.pages){
   assert.equal((page.html.match(/document\.addEventListener\('click',event=>/g)||[]).length,1,page.slug);
  }
 });
 it('interpolates 3D movement and projects portals from the rendered position',()=>{
  for(const page of site.pages){
   assert.match(page.html,/let renderWalkX=walkX,renderWalkY=walkY/,page.slug);
   assert.match(page.html,/renderWalkX\+=\(walkX-renderWalkX\)\*\.16/,page.slug);
   assert.match(page.html,/gl\.uniform2f\(walkUniform,renderWalkX,renderWalkY\)/,page.slug);
   assert.match(page.html,/portal\.x-renderWalkX/,page.slug);
  }
 });
 it('keeps portals available when reduced motion is enabled during browsing',()=>{
  for(const page of site.pages){
   assert.match(page.html,/reduced\.addEventListener\('change',\(\)=>/,page.slug);
   assert.match(page.html,/portal\.link\.style\.display='block'/,page.slug);
  }
 });
 it('does not duplicate immersive scripts when enhancement is repeated',()=>{
  const again=enhanceImmersivePages(site.pages);
  for(const page of again){
   assert.equal((page.html.match(/id="forge-spatial-controller"|id="forge-home-webgl-controller"/g)||[]).length,1,page.slug);
  }
 });
});
