import test from 'node:test';
import assert from 'node:assert/strict';
import {portableStaticSiteLinks} from '../src/lib/portable-static-site-links';
const pages=[{slug:'index'},{slug:'services'},{slug:'about'},{slug:'contact'}];

test('static ZIP page links resolve to real exported HTML siblings without server rewrites',()=>{
 const html='<!doctype html><html><body><a href="/services#offering-1">Services</a>'+
  '<a href="./about.html?from=menu#team">About</a><a href="/contact/">Contact</a>'+
  '<a href="/">Home</a><a href="services">Open menu</a><a href="./">Start</a></body></html>';
 const output=portableStaticSiteLinks(html,pages);
 for(const expected of ['services.html#offering-1','about.html?from=menu#team','contact.html','index.html']){
  assert.ok(output.includes('href="'+expected+'"'),expected);
 }
 assert.ok(!output.includes('href="/services'));
 assert.equal(portableStaticSiteLinks(output,pages),output,'normalization should be idempotent');
});
test('external and unknown links, fragments, mail and API paths are never hijacked',()=>{
 const html='<a href="https://example.com/services">External</a>'+
  '<a href="//external.example/x">External</a><a href="mailto:info@example.com">Email</a>'+
  '<a href="tel:+15551234567">Phone</a><a href="#main-content">Skip</a>'+
  '<a href="/api/contact">Backend</a><a href="/unknown">Unknown</a>'+
  '<a href="?view=full#main-content">Same</a><a href="/assets/catalog.pdf">Catalog</a>';
 assert.equal(portableStaticSiteLinks(html,pages),html);
});
test('script/style source code is not rewritten and untrusted markup is not executed',()=>{
 const html="<script>const template='<a href=\"/services\">';</script>"+
  "<style>body:before{content:'<a href=\"/about\">'}</style>"+
  '<a href="/services">Actual link</a>';
 const actual=portableStaticSiteLinks(html,pages);
 assert.ok(actual.includes("<script>const template='<a href=\"/services\">';</script>"));
 assert.ok(actual.includes("<style>body:before{content:'<a href=\"/about\">'}</style>"));
 assert.ok(actual.endsWith('<a href="services.html">Actual link</a>'));
});
test('works with the real generated page set and preserves fragment identity',()=>{
 const result=portableStaticSiteLinks('<a data-test="menu" href="/services.html#offering-2">Menu</a>',pages);
 assert.equal(result,'<a data-test="menu" href="services.html#offering-2">Menu</a>');
});


test('root navigation keeps tracking queries and fragments within the exported or hosted site',()=>{
 for(const href of ['/?from=brand#main-content','/#main-content','./?from=brand#main-content']){
  const output=portableStaticSiteLinks('<a href="'+href+'">Home</a>',pages);
  assert.ok(output.includes('href="index.html'));
  const target=output.match(/href="([^"]+)"/)![1];
  const resolved=new URL(target,'https://forge.example/business-sites/test-owner/services');
  assert.equal(resolved.pathname,'/business-sites/test-owner/index.html');
  assert.equal(resolved.hash,'#main-content');
  if(href.includes('?'))assert.equal(resolved.search,'?from=brand');
 }
 assert.equal(portableStaticSiteLinks('<a href="/?from=brand">Home</a>',[{slug:'services'}]),'<a href="/?from=brand">Home</a>');
});
