import test from 'node:test';
import assert from 'node:assert/strict';
import {extractWebsiteDesignDna,publicSourceAsset} from '../src/lib/website-design-dna';
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
