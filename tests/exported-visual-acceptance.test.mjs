import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectExportedBranding,inspectExportedPhotoCoverage} from '../scripts/exported-visual-acceptance.mjs';

const logo=(alt,url)=>'<html><body><nav><a href="index.html"><img class="source-brand-logo" src="'+url+'" alt="'+alt+'">Disney Home</a></nav><main><h1>Disney Home</h1></main></body></html>';

test('large-site acceptance refuses already-observed Disney promotional partner marks',()=>{
 for(const [alt,url] of [
  ['Disney+ Hulu logo','https://lumiere-a.akamaihd.net/v1/images/disneybundle_slimbanner_logo.png'],
  ['Fortnite | Disney logo','https://lumiere-a.akamaihd.net/v1/images/cg_dcp_fortnitexdisney_hz_desktop.jpeg'],
  ['Make the Holidays Magic logo','https://lumiere-a.akamaihd.net/v1/images/celebrate-the-magic-horizontal-logo-800.png']]){
  const result=inspectExportedBranding(logo(alt,url),'Disney');
  assert.equal(result.promotionalLogoFound,true,alt);
  assert.ok(result.warning);
 }
});

test('company wordmarks and genuine single-brand marks do not fail visual acceptance',()=>{
 const wordmark='<html><body><nav><a href="index.html">Disney Home</a></nav></body></html>';
 assert.equal(inspectExportedBranding(wordmark,'Disney').promotionalLogoFound,false);
 assert.equal(inspectExportedBranding(wordmark,'Disney').branding,'wordmark-or-original-brand');
 assert.equal(inspectExportedBranding(logo('Disney logo','https://disney.com/official-logo.png'),'Disney').promotionalLogoFound,false);
 assert.equal(inspectExportedBranding(logo('Disney | Official Logo','https://disney.com/logo.png'),'Disney').promotionalLogoFound,false);
});

test('distinct offering coverage is recorded without pretending it proves visual quality',()=>{
 const article=photo=>'<article class="service-card"><h2>Product</h2>'+ (photo?'<img class="service-photo" src="/product.jpg" alt="Product">':'')+'</article>';
 const report=inspectExportedPhotoCoverage('<main>'+article(true)+article(false)+article(false)+article(false)+'</main>');
 assert.equal(report.offeringCards,4);
 assert.equal(report.offeringCardsWithPhoto,1);
 assert.equal(report.contentImages,1);
 assert.ok(report.warning);
});
