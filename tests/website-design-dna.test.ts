import test from 'node:test';
import assert from 'node:assert/strict';
import {extractWebsiteDesignDna,mergeSourcePageImages,publicSourceAsset} from '../src/lib/website-design-dna';
test('source DNA captures original brand assets, contact links and bounded design metadata',()=>{
 const dna=extractWebsiteDesignDna(`<header><img src="/logo.png" alt="Pizza logo" width="180" height="90"></header><section class="hero"><img data-src="/wings.jpg?size=large&amp;fit=cover" alt="Hot wings" width="800" height="600"><a href="mailto:hello@example.com?subject=Menu">Email</a><a href="tel:+1 (555) 123-4567">Call</a></section><style>body{background:#fff;color:#123456;font-family:'Brand Sans', sans-serif}@media(max-width:768px){.hero{display:block}}.hero{background-image:url('/oven.webp')}</style>`,'https://example.com/');
 assert.equal(dna.logo?.url,'https://example.com/logo.png');assert.equal(dna.images[1].url,'https://example.com/wings.jpg?size=large&fit=cover');assert.equal(dna.images[2].role,'background');assert.deepEqual(dna.contact,{emails:['hello@example.com'],phones:['+1 (555) 123-4567']});assert.deepEqual(dna.layout,{header:true,hero:true,sectionCount:1,breakpoints:[768]});assert.deepEqual(dna.palette,['#fff','#123456']);assert.deepEqual(dna.typography.families,['Brand Sans, sans-serif']);
});
test('unsafe asset destinations, tracking pixels, scripts and duplicate images are excluded',()=>{
 for(const value of ['javascript:alert(1)','data:image/svg+xml,bad','http://example.com/a.jpg','https://127.0.0.1/a.jpg','https://host.local/a.jpg','https://host.internal/a.jpg','https://user:pass@example.com/a.jpg','https://[::1]/a.jpg'])assert.equal(publicSourceAsset(value,'https://example.com/'),undefined);
 const dna=extractWebsiteDesignDna(`<script>"<img src='/fake.jpg'>"</script><img src='/pixel.gif' width='1' height='1'><img src='/real.jpg' alt='Pizza'><img src='/real.jpg' alt='Pizza'>`,'https://example.com/');assert.deepEqual(dna.images.map(image=>image.url),['https://example.com/real.jpg']);
});
test('missing assets are reported and untrusted CSS remains bounded evidence',()=>{
 const dna=extractWebsiteDesignDna('<h1>Business</h1>','https://example.com/',['body{font-family:url(javascript:alert(1));background:#abc}']);assert.deepEqual(dna.typography.families,[]);assert.ok(dna.warnings.some(warning=>warning.includes('No reusable')));assert.equal(dna.images.length,0);
 const many=extractWebsiteDesignDna(Array.from({length:100},(_,i)=>`<img src='/photo-${i}.jpg'>`).join(''),'https://example.com/');assert.equal(many.images.length,30);
});
test('an observed body background takes precedence over incidental stylesheet colors',()=>{
 const dna=extractWebsiteDesignDna('<style>.icon{color:#ff0000}body{color:#111;background:#ffffff}</style>','https://example.com/');assert.equal(dna.palette[0],'#ffffff');
});
test('explicit site identity metadata takes precedence over marketing page titles without guessing names',()=>{
 const pizza=extractWebsiteDesignDna('<title>Pizza Delivery & Carryout, Pasta, Wings & More</title><meta property="og:site_name" content="Domino&#39;s">','https://example.com/');assert.equal(pizza.businessName,"Domino's");
 const decor=extractWebsiteDesignDna('<meta content="HomeGoods" name="application-name"><title>Home Decor Store and More</title>','https://example.com/');assert.equal(decor.businessName,'HomeGoods');
 const absent=extractWebsiteDesignDna('<title>Pizza Delivery & Carryout</title><img src="/logo.jpg" alt="Pizza logo">','https://example.com/');assert.equal(absent.businessName,undefined);assert.ok(!('businessName' in absent));
 const oversized=extractWebsiteDesignDna('<meta property="og:site_name" content="'+('x'.repeat(101))+'">','https://example.com/');assert.equal(oversized.businessName,undefined);
});


test('responsive and lazy-loaded images preserve real business photos and filename-based logos',()=>{
 const html='<header><img src="/assets/brand-logo.svg"></header>'+
  '<img src="data:image/gif;base64,AAAA" srcset="/wings-small.webp 320w, /wings-large.webp 1600w" alt="Buffalo chicken wings">'+
  '<img src="/placeholder.gif" data-srcset="/patio-small.jpg 400w, /patio-large.jpg 1920w" alt="Restaurant patio">'+
  '<img data-original="/bakery.jpg" src="/blank.gif" alt="Fresh bakery items">'+
  '<img data-src="data:image/gif;base64,BBBB" data-lazy-src="/staff.jpg" alt="Restaurant staff">';
 const dna=extractWebsiteDesignDna(html,'https://example.com/');
 assert.equal(dna.logo?.url,'https://example.com/assets/brand-logo.svg');
 assert.deepEqual(dna.images.map(image=>image.url),[
  'https://example.com/assets/brand-logo.svg',
  'https://example.com/wings-large.webp',
  'https://example.com/patio-large.jpg',
  'https://example.com/bakery.jpg',
  'https://example.com/staff.jpg'
 ]);
 assert.ok(dna.images.slice(1).every(image=>image.role==='content'));
});
test('responsive sources ignore unsafe URLs and choose a safe remaining candidate',()=>{
 const dna=extractWebsiteDesignDna('<img alt="Pizza" src="data:image/gif;base64,AAAA" srcset="https://127.0.0.1/private.jpg 1600w, https://images.example.com/pizza.jpg 1200w">','https://example.com/');
 assert.deepEqual(dna.images.map(image=>image.url),['https://images.example.com/pizza.jpg']);
});


test('same-site interior page photographs supplement homepage evidence without replacing identity',()=>{
 const home=extractWebsiteDesignDna('<img src="/logo.png" alt="Restaurant logo"><img src="/hero.jpg" alt="Restaurant entrance">','https://wings.example/');
 const menu=extractWebsiteDesignDna('<img src="/wings.jpg" alt="Chicken wings"><img src="/pizza.jpg" alt="Pizza">','https://wings.example/menu');
 const copied=mergeSourcePageImages(home,[{path:'/menu',images:menu.images}]);
 assert.equal(copied.logo?.url,'https://wings.example/logo.png');
 assert.deepEqual(copied.images.map(image=>image.url),[
  'https://wings.example/logo.png','https://wings.example/hero.jpg',
  'https://wings.example/wings.jpg','https://wings.example/pizza.jpg'
 ]);
 assert.equal(copied.images[2].sourcePage,'https://wings.example/menu');
 assert.equal(home.images.length,2,'original homepage evidence must not be mutated');
 assert.equal(mergeSourcePageImages(copied,[{path:'/menu',images:menu.images}]).images.length,4);
});
test('interior image aggregation rejects other-site evidence and respects image limits',()=>{
 const home=extractWebsiteDesignDna('<h1>Studio</h1>','https://studio.example/');
 const good=extractWebsiteDesignDna(
  Array.from({length:30},(_,index)=>'<img src="/item-'+index+'.jpg" alt="Product '+index+'">').join(''),
  'https://studio.example/products');
 const evil=extractWebsiteDesignDna('<img src="/unrelated.jpg" alt="Unrelated">','https://other.example/offer');
 const merged=mergeSourcePageImages(home,[
  {path:'//other.example/offer',images:evil.images},
  {path:'/products',images:evil.images},
  {path:'/products',images:good.images},
  {path:'/products',images:good.images}
 ]);
 assert.equal(merged.images.length,30);
 assert.ok(merged.images.every(image=>image.sourcePage==='https://studio.example/products'));
 assert.equal(merged.images.some(image=>image.url.includes('unrelated')),false);
 assert.equal(mergeSourcePageImages(home,[{path:'/products',images:[{url:'javascript:bad()',alt:'Product',role:'content',sourcePage:'https://studio.example/products'}]}]).images.length,0);
});


test('CSS variable backgrounds preserve the actual body surface ahead of accent declarations',()=>{
 const source='<style>:root{--brand-accent:#ed6700;--brand-surface:#faf0da;--brand-ink:#191c23}body{background-color:var(--brand-surface);color:var(--brand-ink)}</style>';
 const dna=extractWebsiteDesignDna(source,'https://cafe.example/');
 assert.equal(dna.palette[0],'#faf0da');
 assert.ok(dna.palette.includes('#ed6700'));
});
test('CSS-only company logos are discovered without copying executable source styles',()=>{
 const source='<header><a href="/">Studio</a></header><style>.site-logo{display:block;background-image:url("/assets/brand-logo.svg")} .hero{background-image:url("/assets/studio.jpg")}</style>';
 const dna=extractWebsiteDesignDna(source,'https://studio.example/');
 assert.equal(dna.logo?.url,'https://studio.example/assets/brand-logo.svg');
 assert.equal(dna.logo?.role,'logo');
 assert.equal(dna.images.some(image=>image.role==='background'&&image.url==='https://studio.example/assets/studio.jpg'),true);
 assert.equal(dna.images.filter(image=>image.url.endsWith('brand-logo.svg')).length,1);
});
test('CSS logo detection ignores unsafe non-HTTPS URLs and unrelated selectors',()=>{
 const source='<style>.logo{background:url("javascript:alert(1)")}.catalogo{background:url("/catalog.jpg")}.hero{background:url("/banner.jpg")}</style>';
 const dna=extractWebsiteDesignDna(source,'https://studio.example/');
 assert.equal(dna.logo,undefined);
 assert.equal(dna.images.some(image=>image.url.includes('javascript:')),false);
 assert.equal(dna.images.some(image=>image.role==='logo'),false);
 assert.ok(dna.images.some(image=>image.url==='https://studio.example/banner.jpg'));
});

test('responsive picture sources preserve real product photos and alt labels over fallback placeholders',()=>{
 const source=[
  '<picture><source type="image/avif" srcset="/wings-400.avif 400w, /wings-1600.avif 1600w"><source type="image/webp" srcset="/wings-1200.webp 1200w"><img alt="Chicken wings" src="/blank.gif" width="1200" height="800"></picture>',
  '<picture><source media="(max-width: 600px)" srcset="/mobile-mugs.webp 500w"><source media="(min-width: 601px)" srcset="/ceramic-mugs.webp 1600w"><img alt="Ceramic mugs" src="/fallback.jpg"></picture>',
  '<img src="/outdoor-patio.jpg" alt="Outdoor patio">'
 ].join('');
 const dna=extractWebsiteDesignDna(source,'https://cafe.example/');
 assert.deepEqual(dna.images.map(x=>x.url),[
  'https://cafe.example/wings-1600.avif',
  'https://cafe.example/ceramic-mugs.webp',
  'https://cafe.example/outdoor-patio.jpg'
 ]);
 assert.deepEqual(dna.images.map(x=>x.alt),['Chicken wings','Ceramic mugs','Outdoor patio']);
 assert.equal(dna.images[0].width,1200);
});
test('malformed, unsafe or unrelated picture sources never escape the ordinary safe fallback',()=>{
 const html=[
  '<picture><source srcset="javascript:alert(1) 400w, https://127.0.0.1/private.avif 1200w" type="image/avif"><img src="/safe.jpg" alt="Local business storefront"></picture>',
  '<picture><source type="application/javascript" srcset="/malicious.js 2000w"><img src="/real.jpg" alt="Pizza"></picture>',
  '<picture><source srcset="/tracking.avif 1600w"><img src="/one-pixel.gif" alt="tracking pixel" width="1" height="1"></picture>'
 ].join('');
 const dna=extractWebsiteDesignDna(html,'https://shop.example/');
 assert.deepEqual(dna.images.map(x=>x.url),[
  'https://shop.example/safe.jpg',
  'https://shop.example/real.jpg'
 ]);
 assert.ok(!dna.images.some(x=>x.url.includes('malicious')||x.url.includes('tracking')));
});
test('picture sources belong only to their nested image and preserve filename-based logo identity',()=>{
 const dna=extractWebsiteDesignDna(
  '<picture><source type="image/webp" srcset="/logo-large.webp 1200w"><img src="/tiny-placeholder.gif" class="company-logo" alt="Company logo"></picture>'+
  '<img src="/regular-product.jpg" alt="Chicken wings">',
  'https://shop.example/');
 assert.equal(dna.logo?.url,'https://shop.example/logo-large.webp');
 assert.equal(dna.images[1].url,'https://shop.example/regular-product.jpg');
});


test('late source logo displaces an excess category image rather than vanishing at the evidence limit',()=>{
 const gallery=Array.from({length:40},(_,i)=>'<img src="/products/item-'+i+'.jpg" alt="Retail product '+i+'">').join('');
 const dna=extractWebsiteDesignDna(gallery+'<header><img src="/assets/official-logo.svg" alt="Retailer logo"></header>','https://retail.example/');
 assert.equal(dna.images.length,30);
 assert.equal(dna.logo?.url,'https://retail.example/assets/official-logo.svg');
 assert.equal(dna.images[0].role,'logo');
 assert.equal(dna.images.filter(asset=>asset.role==='content').length,29);
 assert.equal(dna.images.some(asset=>asset.url.includes('item-29.jpg')),false);
});
test('first-party published touch icon can supply a source-backed fallback when no logo URL exists',()=>{
 const gallery=Array.from({length:35},(_,i)=>'<img src="/products/item-'+i+'.jpg" alt="Product '+i+'">').join('');
 const source='<link rel="icon" href="https://other.example/unrelated.svg">'+
  '<link rel="shortcut icon" href="/favicon.ico">'+
  '<link rel="apple-touch-icon" href="/assets/touch-180.png">'+gallery;
 const dna=extractWebsiteDesignDna(source,'https://retail.example/');
 assert.equal(dna.logo?.url,'https://retail.example/assets/touch-180.png');
 assert.equal(dna.logo?.alt,'Source website icon');
 assert.equal(dna.images.length,30);
 assert.equal(dna.images.filter(asset=>asset.role==='logo').length,1);
 assert.equal(dna.images.some(asset=>asset.url.includes('unrelated.svg')),false);
 assert.equal(extractWebsiteDesignDna('<link rel="icon" href="//other.example/icon.png">','https://retail.example/').logo,undefined);
});
test('source logo takes precedence over its favicon when both are publicly observed',()=>{
 const dna=extractWebsiteDesignDna('<link rel="apple-touch-icon" href="/touch.png"><img class="brand-logo" src="/brand.svg" alt="Business logo">','https://retail.example/');
 assert.equal(dna.logo?.url,'https://retail.example/brand.svg');
 assert.equal(dna.images.some(asset=>asset.url.endsWith('/touch.png')),false);
});


test('repeated source image is promoted to logo when CSS identifies its brand role',()=>{
 const source='<img src="/company-symbol.svg" alt="Company symbol">'+
  '<style>.site-logo{background-image:url("/company-symbol.svg")}</style>';
 const dna=extractWebsiteDesignDna(source,'https://studio.example/');
 assert.equal(dna.logo?.url,'https://studio.example/company-symbol.svg');
 assert.equal(dna.images.filter(image=>image.url.endsWith('/company-symbol.svg')).length,1);
 assert.equal(dna.images[0].role,'logo');
});
