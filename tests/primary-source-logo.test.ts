import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applySourceDesign} from '../src/lib/apply-source-design';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';

const page=(name:string)=>[{
 slug:'index',title:'Home',
 html:'<!doctype html><html><head></head><body><nav><a href="index.html"><span class="brand-mark" aria-hidden="true">D</span>'+name+'</a></nav><main><h1>'+name+'</h1></main></body></html>'
}];

test('real Disney co-brand campaign logo cannot impersonate primary Disney branding',()=>{
 const url='https://lumiere-a.akamaihd.net/v1/images/hb_disney_disneybundle_slimbanner_logo_mobile_31324374.png?region=0,0,450,177';
 const source=extractWebsiteDesignDna('<meta property="og:site_name" content="Disney Home"><img src="'+url+'" alt="Disney+ Hulu logo">','https://disney.com/');
 assert.equal(source.logo?.role,'logo','promotional asset is indeed labeled a logo by the source');
 const result=applySourceDesign(page('Disney Home'),source,'redesign');
 assert.doesNotMatch(result.pages[0].html,/class="source-brand-logo"/);
 assert.doesNotMatch(result.pages[0].html,/hb_disney_disneybundle_slimbanner_logo/);
 assert.match(result.pages[0].html,/>Disney Home<\/a>/);
 assert.ok(result.warnings.some(warning=>warning.includes('Co-branded')));
});

test('legitimate first-party and single-brand source marks are still preserved',()=>{
 for(const alt of ['Disney logo','Disney+ logo','Source website logo']){
  const source=extractWebsiteDesignDna('<img src="/site-logo.png" alt="'+alt+'">','https://disney.com/');
  const result=applySourceDesign(page('Disney Home'),source,'inspired');
  assert.match(result.pages[0].html,/class="source-brand-logo"/,alt);
 }
});

test('single-brand campaign banners remain usable as content but not as logos',()=>{
 const source=extractWebsiteDesignDna('<img src="/disney-bundle-banner-logo.png" alt="Disney+ Hulu logo"><img src="/official-logo.png" alt="Disney logo">','https://disney.com/');
 const result=applySourceDesign(page('Disney Home'),source,'redesign');
 assert.match(result.pages[0].html,/src="https:\/\/disney.com\/official-logo.png"/);
 assert.doesNotMatch(result.pages[0].html,/class="source-brand-logo"[^>]*bundle/);
});
