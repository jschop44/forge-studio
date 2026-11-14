import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectExportedBranding,inspectExportedPhotoCoverage,inspectEditorialHero,inspectExportedLayout} from '../scripts/exported-visual-acceptance.mjs';
import {readFileSync} from 'node:fs';

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

test('actual Disney-style text-only hero plus wide gallery photo fails visual acceptance',()=>{
 const html='<main><section class="site-hero editorial text-led"><h1>Story World</h1></section>'+
  '<section class="source-highlights" data-forge-source-highlights><figure><img class="source-highlights-photo" src="https://media.example/story.jpg" alt="Animated adventurers standing on a rock in the ocean" width="2048" height="878"></figure></section></main>';
 const check=inspectEditorialHero(html);
 assert.equal(check.heroTextLed,true);
 assert.equal(check.sourceHero,false);
 assert.equal(check.wideGalleryPhoto,true);
 assert.match(check.warning,/lacks an integrated first-party hero/);
});
test('integrated editorial hero passes and never uses a product gallery picture as proof',()=>{
 const html='<main><section class="site-hero editorial image-led"><div><h1>Story World</h1></div>'+
  '<figure class="editorial-photo" data-forge-source-figure><img class="source-photo" data-forge-source-image src="https://media.example/story.jpg" alt="Animated adventurers standing together" width="2048" height="878"></figure></section>'+
  '<section class="source-highlights"><figure><img src="/doll.jpg" alt="Story store collectible doll" width="800" height="800"></figure></section></main>';
 const check=inspectEditorialHero(html);
 assert.equal(check.sourceHero,true);
 assert.equal(check.heroTextLed,false);
 assert.equal(check.wideGalleryPhoto,false);
 assert.equal(check.warning,null);
});
test('a text-led homepage without a verified wide gallery photo is not an invented defect',()=>{
 const check=inspectEditorialHero('<main><section class="site-hero editorial text-led"><h1>Story World</h1></section></main>');
 assert.equal(check.warning,null);
});


test('exported mobile and desktop layouts reject horizontal page overflow and visible clipped headings',()=>{
 const clean={page:'about.html',device:'390px',documentWidth:390,viewportWidth:390,headingsClipped:[],images:{confirmedBroken:0}};
 assert.equal(inspectExportedLayout(clean).passes,true);
 const overflowing=inspectExportedLayout({...clean,documentWidth:419});
 assert.equal(overflowing.passes,false);
 assert.match(overflowing.defects.join(' '),/about\.html at 390px: horizontal overflow 29px/);
 const clipped=inspectExportedLayout({...clean,page:'services.html',headingsClipped:['Professional Emergency Repair Services']});
 assert.equal(clipped.passes,false);
 assert.match(clipped.defects.join(' '),/clipped visible headings/);
 const images=inspectExportedLayout({...clean,images:{confirmedBroken:2}});
 assert.match(images.defects.join(' '),/2 browser-confirmed broken images/);
});

test('subpixel layout tolerance and pending lazy photos do not manufacture visual failures',()=>{
 const report=inspectExportedLayout({
  page:'contact.html',device:'desktop',documentWidth:1282,viewportWidth:1280,
  headingsClipped:[],images:{confirmedBroken:0,unloadedLazy:4}
 });
 assert.equal(report.passes,true);
 assert.deepEqual(report.defects,[]);
});

test('live exported-site acceptance includes every secondary HTML page at both viewport widths',()=>{
 const runner=readFileSync(new URL('../scripts/live-large-site-acceptance.mjs',import.meta.url),'utf8');
 assert.match(runner,/for\(const name of files\.keys\(\)\)/);
 assert.match(runner,/if\(name==='index\.html'\)continue/);
 assert.match(runner,/for\(const \[width,device\] of \[\[1280,'desktop'\],\[390,'390px'\]\]\)/);
 assert.match(runner,/inspectExportedLayout\(\{page:name,device/);
 assert.match(runner,/if\(!layout\.passes\)throw Error\('Exported secondary-page visual defects:/);
});


test('colored-shell exports fail when main content is hidden or absent',()=>{
 const common={page:'services.html',device:'390px',viewportWidth:390,documentWidth:390,
  headingsClipped:[],images:{confirmedBroken:0}};
 const missing=inspectExportedLayout({...common,hasMain:false,mainVisibleTextLength:0,mainVisiblePhotos:0});
 assert.equal(missing.passes,false);
 assert.match(missing.defects.join(' '),/no visible main content landmark/);
 const hidden=inspectExportedLayout({...common,hasMain:true,mainVisibleTextLength:0,mainVisiblePhotos:0});
 assert.equal(hidden.passes,false);
 assert.match(hidden.defects.join(' '),/essentially blank main content/);
 const tiny=inspectExportedLayout({...common,hasMain:true,mainVisibleTextLength:12,mainVisiblePhotos:0});
 assert.equal(tiny.passes,false);
 const text=inspectExportedLayout({...common,hasMain:true,mainVisibleTextLength:75,mainVisiblePhotos:0});
 assert.equal(text.passes,true);
 const visual=inspectExportedLayout({...common,hasMain:true,mainVisibleTextLength:15,mainVisiblePhotos:1});
 assert.equal(visual.passes,true,'A genuine loaded content photo can support a short text page');
});

test('browser acceptance measures visible main copy on the homepage and every secondary export',()=>{
 const source=readFileSync(new URL('../scripts/live-large-site-acceptance.mjs',import.meta.url),'utf8');
 assert.equal((source.match(/mainVisibleTextLength:/g)||[]).length,2,
  'Homepage and secondary page measurements must each capture visible main text');
 assert.equal((source.match(/mainVisiblePhotos:/g)||[]).length,2);
 assert.equal((source.match(/hasMain:!!main/g)||[]).length,2);
});
