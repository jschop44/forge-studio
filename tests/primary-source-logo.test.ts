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


test('Fortnite | Disney branded campaign artwork is not the Disney header logo',()=>{
 const asset='https://lumiere-a.akamaihd.net/v1/images/cg_dcp_fortnitexdisney_hz_desktop_crop_b4ef4da3.jpeg?region=0,0,1460,600';
 const source=extractWebsiteDesignDna('<meta property="og:site_name" content="Disney Home"><img src="'+asset+'" alt="Fortnite | Disney logo">','https://disney.com/');
 assert.equal(source.images[0]?.role,'logo','source labelled the image as a logo');
 const result=applySourceDesign(page('Disney Home'),source,'inspired');
 assert.doesNotMatch(result.pages[0].html,/class="source-brand-logo"/);
 assert.match(result.pages[0].html,/>Disney Home<\/a>/,'preserve the company wordmark');
 assert.ok(result.warnings.some(warning=>warning.includes('Co-branded')));
});

test('a normal source mark using a pipe as a decorative label is not removed',()=>{
 const source=extractWebsiteDesignDna('<img src="/logo.png" alt="Disney | Official Logo">','https://disney.com/');
 const result=applySourceDesign(page('Disney Home'),source,'redesign');
 assert.match(result.pages[0].html,/class="source-brand-logo"/);
});


test('Disney holiday campaign artwork with logo in its alt is not the corporate logo',()=>{
 const holiday='https://lumiere-a.akamaihd.net/v1/images/celebrate-the-magic-horizontal-logo-800_b926123c.png?region=0,0,800,179';
 const source=extractWebsiteDesignDna(
  '<meta property="og:site_name" content="Disney Home">'+
  '<img src="'+holiday+'" alt="Make the Holidays Magic logo">',
  'https://www.disney.com/');
 assert.equal(source.logo?.alt,'Make the Holidays Magic logo');
 const output=applySourceDesign(page('Disney Home'),source,'inspired');
 assert.doesNotMatch(output.pages[0].html,/class="source-brand-logo"/);
 assert.match(output.pages[0].html,/>Disney Home<\/a>/);
 assert.ok(output.warnings.some(warning=>warning.includes('non-company')));
});

test('primary brand matches actual company even when retail page shows other manufacturer logos',()=>{
 const source=extractWebsiteDesignDna(
  '<meta property="og:site_name" content="Best Buy">'+
  '<img src="/apple-logo.png" alt="Apple logo">'+
  '<img src="/bestbuy-logo.png" alt="Best Buy logo">',
  'https://www.bestbuy.com/');
 const result=applySourceDesign(page('Best Buy'),source,'redesign');
 assert.match(result.pages[0].html,/class="source-brand-logo"[^>]*bestbuy-logo\.png/);
 assert.doesNotMatch(result.pages[0].html,/class="source-brand-logo"[^>]*apple-logo\.png/);
});

test('unknown example-domain fixtures retain their observed primary marks',()=>{
 const source=extractWebsiteDesignDna('<img src="/brand.png" alt="Pizza logo">','https://example.com/');
 const result=applySourceDesign(page('Pizza'),source,'redesign');
 assert.match(result.pages[0].html,/class="source-brand-logo"/);
});
