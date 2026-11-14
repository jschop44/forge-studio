import test from 'node:test';
import assert from 'node:assert/strict';
import {applySourceDesign} from '../src/lib/apply-source-design';
import {extractWebsiteDesignDna,mergeSourcePageImages} from '../src/lib/website-design-dna';
const dna=extractWebsiteDesignDna('<header><img src="/logo.png" alt="Pizza logo"></header><img src="/wings.jpg" alt="Chicken wings"><img src="/pizza.jpg" alt="Pizza"><a href="mailto:info@example.com">Email</a><a href="tel:+15551234567">Call</a><style>body{background:#fff;font-family:Georgia,serif}</style>','https://example.com/');
const wrap=(body:string)=>'<!doctype html><html><head><title>Business</title></head><body><nav><a href="index.html"><span class="brand-mark">P</span>Pizza</a></nav><main>'+body+'</main><footer>Business</footer></body></html>';
test('source branding, semantically matched offering images and observed contact links reach every page',()=>{
 const pages=[{slug:'index',title:'Home',html:wrap('<section class="site-hero"><h1>Pizza</h1><figure class="editorial-photo"><img src="https://stock.example/a.jpg" alt="Restaurant photography"></figure></section>')},{slug:'services',title:'Menu',html:wrap('<article><h2>Chicken wings</h2><img src="https://stock.example/b.jpg"></article><article><h2>Pasta</h2></article>')},{slug:'contact',title:'Contact',html:wrap('<p>Contact details are being updated.</p>')}];
 const result=applySourceDesign(pages,dna,'redesign');for(const page of result.pages){assert.ok(page.html.includes('https://example.com/logo.png'));assert.ok(page.html.includes('mailto:info@example.com'));assert.ok(page.html.includes('tel:+15551234567'))}assert.ok(result.pages[1].html.includes('src="https://example.com/wings.jpg"'));assert.ok(!result.pages[1].html.includes('<h2>Pasta</h2><img'));assert.ok(!result.pages[2].html.includes('Contact details are being updated'));assert.ok(!result.pages[0].html.includes('body{background:#fff'));assert.ok(!pages[0].html.includes('source-brand-logo'));
});
test('preserve uses safe source design tokens and remains explicit about fidelity limits',()=>{
 const pages=[{slug:'index',title:'Home',html:wrap('<h1>Pizza</h1>')}];const result=applySourceDesign(pages,dna,'inspired');assert.ok(result.pages[0].html.includes('body{background:#fff'));assert.ok(result.pages[0].html.includes('font-family:"Georgia",serif'));assert.ok(result.pages[0].html.includes('data-forge-source-page-visual'));assert.ok(result.warnings.some(warning=>warning.includes('visual fidelity remain unverified')));assert.deepEqual(applySourceDesign(pages,dna,'new'),{pages,warnings:[]});
});
test('unsafe serialized evidence cannot inject executable styles, markup or private destinations',()=>{
 const unsafe={...dna,palette:['</style><script>bad()</script>'],typography:{families:['Arial;url(secret)']},images:[{url:'javascript:alert(1)',alt:'bad',role:'content' as const,sourcePage:dna.sourceUrl}],contact:{emails:['x@example.com"><script>bad()</script>'],phones:['javascript:alert(1)']}};
 const result=applySourceDesign([{slug:'index',title:'Home',html:wrap('<h1>Pizza</h1>')}],unsafe,'inspired');assert.ok(!result.pages[0].html.includes('<script>'));assert.ok(!result.pages[0].html.includes('javascript:'));assert.ok(!result.pages[0].html.includes('url(secret)'));assert.ok(result.warnings.some(warning=>warning.includes('No source images')));
});
test('summary pages receive source identity without a generated brand marker or footer',()=>{
 const pages=[{slug:'find-a-store',title:'Find a Store',html:'<html><head></head><body><nav><a href="index.html">Business</a></nav><main><h1>Find a Store</h1></main></body></html>'}];const once=applySourceDesign(pages,dna,'redesign'),twice=applySourceDesign(once.pages,dna,'redesign');assert.ok(once.pages[0].html.includes('source-brand-logo'));assert.ok(once.pages[0].html.includes('mailto:info@example.com'));assert.equal((twice.pages[0].html.match(/class="source-brand-logo"/g)||[]).length,1);assert.equal((twice.pages[0].html.match(/data-forge-source-contact/g)||[]).length,1);
});

test('unrelated source photographs never replace a hero or get inserted as a fallback',()=>{
 const source=extractWebsiteDesignDna('<img src="/fruit.jpg" alt="Fresh fruit bowl"><img src="/wings.jpg" alt="Chicken wings">','https://example.com/');
 const page={slug:'index',title:'Home',html:wrap('<h1>Chicken wings</h1><figure class="editorial-photo"><img src="https://stock.example/wings.jpg" alt="Food photograph"></figure>')};
 const result=applySourceDesign([page],source,'redesign');
 assert.ok(result.pages[0].html.includes('src="https://example.com/wings.jpg"'));
 assert.ok(!result.pages[0].html.includes('src="https://example.com/fruit.jpg"'));
 const unrelated={slug:'index',title:'Home',html:wrap('<h1>Auto repair</h1><figure class="editorial-photo"><img src="https://stock.example/car.jpg" alt="Car service"></figure>')};
 const noMatch=applySourceDesign([unrelated],source,'redesign');
 assert.ok(!noMatch.pages[0].html.includes('src="https://example.com/fruit.jpg"'));
 assert.ok(!noMatch.pages[0].html.includes('src="https://example.com/wings.jpg"'));
});

test('preserve mode carries observed centered hero composition without applying it to redesign',()=>{
 const source=extractWebsiteDesignDna('<section class="hero text-center"><h1>Bakery</h1></section>','https://example.com/');
 assert.equal(source.layout.heroAlignment,'center');
 const pages=[{slug:'index',title:'Home',html:wrap('<section class="site-hero"><div><h1>Bakery</h1></div></section>')}];
 const preserved=applySourceDesign(pages,source,'inspired').pages[0].html;
 const redesigned=applySourceDesign(pages,source,'redesign').pages[0].html;
 assert.ok(preserved.includes('.site-hero{grid-template-columns:1fr;text-align:center;justify-items:center}'));
 assert.ok(!redesigned.includes('.site-hero{grid-template-columns:1fr;text-align:center;justify-items:center}'));
});

test('a source content photograph is not repeated across distinct website pages',()=>{
 const source=extractWebsiteDesignDna(
  '<img src="/brand.png" class="company-logo" alt="Chicken wings logo"><img src="/wings-a.jpg" alt="Chicken wings with spicy sauce"><img src="/wings-b.jpg" alt="Chicken wings with hot sauce">',
  'https://restaurant.example/');
 const pages=[
  {slug:'index',title:'Chicken wings',html:wrap('<h1>Chicken wings</h1><figure class="editorial-photo"><img src="https://stock.example/a.jpg" alt="Chicken wings photograph"></figure>')},
  {slug:'services',title:'Menu',html:wrap('<article><h2>Chicken wings</h2><img src="https://stock.example/b.jpg" alt="Chicken wings photograph"></article>')},
  {slug:'about',title:'About',html:wrap('<h1>Chicken wings</h1><figure class="editorial-photo"><img src="https://stock.example/c.jpg" alt="Chicken wings photograph"></figure>')}
 ];
 const result=applySourceDesign(pages,source,'redesign');
 const allContentUrls=[...result.pages.flatMap(page=>[...page.html.matchAll(/<img class="(?:source-photo|service-photo)" data-forge-source-image src="([^"]+)"/g)].map(match=>match[1]))];
 assert.equal(allContentUrls.length,2,'only two source content photographs are available');
 assert.equal(new Set(allContentUrls).size,allContentUrls.length,'source content photographs must be unique across pages');
 for(const page of result.pages)assert.match(page.html,/src="https:\/\/restaurant\.example\/brand\.png"/,'business logo is intentionally reused');
 assert.match(result.pages[2].html,/src="https:\/\/stock\.example\/c\.jpg"/,'an unmatched page keeps its original image rather than repeating a source photograph');
});

test('specific product cards receive the only matching photograph before a broad homepage hero',()=>{
 const source=extractWebsiteDesignDna('<img src="/wings.jpg" alt="Chicken wings"><img src="/fruit.jpg" alt="Fruit bowl">','https://restaurant.example/');
 const pages=[
  {slug:'index',title:'Chicken wings',html:wrap('<h1>Chicken wings</h1><figure class="editorial-photo"><img src="https://stock.example/wings.jpg" alt="Chicken wings"></figure>')},
  {slug:'services',title:'Menu',html:wrap('<article><h2>Chicken wings</h2><img src="https://stock.example/menu.jpg" alt="Menu photograph"></article>')}
 ];
 const result=applySourceDesign(pages,source,'redesign');
 assert.match(result.pages[0].html,/src="https:\/\/stock\.example\/wings\.jpg"/);
 assert.match(result.pages[1].html,/src="https:\/\/restaurant\.example\/wings\.jpg"/);
 assert.doesNotMatch(result.pages[1].html,/src="https:\/\/restaurant\.example\/fruit\.jpg"/);
});

 test('fallback source figures reserve content photographs across pages',()=>{
 const source=extractWebsiteDesignDna('<img src="/wings-a.jpg" alt="Chicken wings"><img src="/wings-b.jpg" alt="Chicken wings">','https://restaurant.example/');
 const pages=['index','services','about'].map(slug=>({slug,title:'Chicken wings',html:wrap('<h1>Chicken wings</h1>')}));
 const result=applySourceDesign(pages,source,'redesign');
 const urls=result.pages.flatMap(page=>[...page.html.matchAll(/data-forge-source-image src="([^"]+)"/g)].map(match=>match[1]));
 assert.equal(urls.length,2,'only two matching source photographs are available');
 assert.equal(new Set(urls).size,2,'fallback figures must not repeat a photograph');
 assert.doesNotMatch(result.pages[2].html,/data-forge-source-page-visual/);
 });


test('interior product photographs are used for corresponding service cards without unrelated substitutions',()=>{
 const homepage=extractWebsiteDesignDna('<img src="/logo.png" alt="Wings restaurant logo"><img src="/entrance.jpg" alt="Restaurant entrance">','https://restaurant.example/');
 const menu=extractWebsiteDesignDna('<img src="/wings.jpg" alt="Chicken wings"><img src="/pizza.jpg" alt="Pizza"><img src="/salad.jpg" alt="Fruit salad">','https://restaurant.example/menu');
 const siteDna=mergeSourcePageImages(homepage,[{path:'/menu',images:menu.images}]);
 const pages=[
  {slug:'index',title:'Home',html:wrap('<h1>Welcome to our restaurant</h1><article><h2>Chicken wings</h2></article><article><h2>Pizza</h2></article>')},
  {slug:'services',title:'Menu',html:wrap('<article><h2>Chicken wings</h2><img src="https://stock.example/food.jpg"></article><article><h2>Pizza</h2><img src="https://stock.example/food2.jpg"></article>')},
  {slug:'about',title:'About',html:wrap('<h1>Our story</h1>')}
 ];
 const result=applySourceDesign(pages,siteDna,'redesign');
 assert.match(result.pages[1].html,/src="https:\/\/restaurant\.example\/wings\.jpg"/);
 assert.match(result.pages[1].html,/src="https:\/\/restaurant\.example\/pizza\.jpg"/);
 assert.doesNotMatch(result.pages[1].html,/src="https:\/\/restaurant\.example\/salad\.jpg"/);
 assert.doesNotMatch(result.pages[0].html,/src="https:\/\/restaurant\.example\/wings\.jpg"/,'homepage teaser must not consume the menu photo');
 assert.doesNotMatch(result.pages[0].html,/src="https:\/\/restaurant\.example\/pizza\.jpg"/,'homepage teaser must not consume the menu photo');
 const photos=result.pages.flatMap(page=>[...page.html.matchAll(/data-forge-source-image src="([^"]+)"/g)].map(match=>match[1]).filter(url=>!url.endsWith('/logo.png')));
 assert.equal(new Set(photos).size,photos.length,'non-logo source images must remain unique across pages');
 for(const page of result.pages)assert.match(page.html,/src="https:\/\/restaurant\.example\/logo\.png"/);
});


test('partial offering matches never substitute an unrelated source product photograph',()=>{
 const source=extractWebsiteDesignDna(
  '<img src="/salad.jpg" alt="Chicken salad with greens"><img src="/tile.jpg" alt="Ceramic wall tiles"><img src="/bean.jpg" alt="Coffee table made from wood"><img src="/wing.jpg" alt="Chicken wings with sauce"><img src="/mug.jpg" alt="Ceramic mugs">',
  'https://cafe.example/');
 const page={slug:'services',title:'Menu',html:wrap(
  '<article><h2>Chicken wings</h2><img src="https://stock.example/unmatched-a.jpg"></article>'+
  '<article><h2>Ceramic mugs</h2><img src="https://stock.example/unmatched-b.jpg"></article>'+
  '<article><h2>Coffee beans</h2><img src="https://stock.example/unmatched-c.jpg"></article>')};
 const revised=applySourceDesign([page],source,'redesign').pages[0].html;
 assert.match(revised,/src="https:\/\/cafe\.example\/wing\.jpg"/);
 assert.match(revised,/src="https:\/\/cafe\.example\/mug\.jpg"/);
 assert.doesNotMatch(revised,/src="https:\/\/cafe\.example\/salad\.jpg"/);
 assert.doesNotMatch(revised,/src="https:\/\/cafe\.example\/tile\.jpg"/);
 assert.doesNotMatch(revised,/src="https:\/\/cafe\.example\/bean\.jpg"/);
 assert.match(revised,/src="https:\/\/stock\.example\/unmatched-c\.jpg"/,
  'the original Coffee beans placeholder is safer than incorrectly using a photo of a coffee table');
});
test('a single distinctive item and harmless inflection still permit a verified match',()=>{
 const source=extractWebsiteDesignDna('<img src="/pizza.jpg" alt="House pizzas"><img src="/wings.jpg" alt="Chicken wings photograph">','https://restaurant.example/');
 const pages=[
  {slug:'services',title:'Menu',html:wrap('<article><h2>Pizza</h2></article>')},
  {slug:'index',title:'Home',html:wrap('<h1>Chicken wings</h1><figure class="editorial-photo"><img src="https://stock.example/photo.jpg" alt="Restaurant photography"></figure>')}
 ];
 const result=applySourceDesign(pages,source,'redesign');
 assert.match(result.pages[0].html,/src="https:\/\/restaurant\.example\/pizza\.jpg"/);
 assert.match(result.pages[1].html,/src="https:\/\/restaurant\.example\/wings\.jpg"/);
});


test('preserve applies CSS-hosted company logo and resolved background without executing source CSS',()=>{
 const source=extractWebsiteDesignDna(
  '<style>:root{--promo-accent:#ef672b;--brand-surface:#f8f3e9}.site-logo{background-image:url("/brand.svg")}body{background-color:var(--brand-surface)}</style>',
  'https://atelier.example/');
 const page={slug:'index',title:'Home',html:wrap('<h1>Atelier</h1><p>Our craftsmanship</p>')};
 const result=applySourceDesign([page],source,'inspired');
 const html=result.pages[0].html;
 assert.match(html,/class="source-brand-logo" data-forge-source-image src="https:\/\/atelier\.example\/brand\.svg"/);
 assert.match(html,/body\{background:#f8f3e9;color:#151515\}/);
 assert.doesNotMatch(html,/var\(--brand-surface\)|background-image:url/,'source CSS remains unexecuted evidence');
});

test('unavailable source webfonts retain a readable system fallback',()=>{
 const dna=extractWebsiteDesignDna('<style>body{font-family:InspireTWDC}</style>','https://example.com');
 const result=applySourceDesign([{slug:'index',title:'Home',html:'<!doctype html><html><head></head><body><main><h1>Home</h1></main></body></html>'}],dna,'inspired');
 assert.match(result.pages[0].html,/font-family:"InspireTWDC",system-ui,sans-serif/);
});

test('source tracking beacons do not become duplicate business photographs',()=>{
 const dna=extractWebsiteDesignDna('<img src="/akam/13/pixel_62c5ef83"><img src="/products/pixel-9.jpg" alt="Google phone">','https://example.com');
 assert.deepEqual(dna.images.map(image=>image.url),['https://example.com/products/pixel-9.jpg']);
});

test('escaped retail category labels match their actual source photographs',()=>{
 const dna=extractWebsiteDesignDna('<img src="/tv.jpg" alt="TV &amp; Home Theater"><img src="/computer.jpg" alt="Computers &amp; Tablets">','https://example.com');
 const result=applySourceDesign([{slug:'services',title:'Products',html:wrap('<article><h2>TV &amp; Home Theater</h2></article><article><h2>Computers &amp; Tablets</h2></article>')}],dna,'inspired');
 assert.match(result.pages[0].html,/src="https:\/\/example.com\/tv.jpg"/);
 assert.match(result.pages[0].html,/src="https:\/\/example.com\/computer.jpg"/);
});

test('interior-page image evidence rejects unknown-size beacons while retaining Pixel product shots',()=>{
 const homepage=extractWebsiteDesignDna('<img src="/logo.png" alt="Retailer logo">','https://retailer.example/');
 const merged=mergeSourcePageImages(homepage,[{path:'/phones',images:[
  {url:'https://retailer.example/akam/13/pixel_62c5ef83',alt:'',role:'content',sourcePage:'https://retailer.example/phones'},
  {url:'https://retailer.example/products/pixel-9.jpg',alt:'Google Pixel 9 phone',role:'content',sourcePage:'https://retailer.example/phones'}
 ]}]);
 assert.deepEqual(merged.images.map(image=>image.url),[
  'https://retailer.example/logo.png','https://retailer.example/products/pixel-9.jpg'
 ]);
});


test('source logos and above-fold photographs load eagerly while offering cards remain lazy',()=>{
 const source=extractWebsiteDesignDna(
  '<img src="/logo.png" alt="Market logo"><img src="/grand-opening.jpg" alt="Grand opening"><img src="/wings.jpg" alt="Chicken wings">',
  'https://market.example/');
 const pages=[
  {slug:'index',title:'Grand opening',html:wrap('<h1>Grand opening</h1><figure class="editorial-photo"><img src="https://stock.example/placeholder.jpg" alt=""></figure>')},
  {slug:'services',title:'Menu',html:wrap('<article><h2>Chicken wings</h2></article>')}
 ];
 const generated=applySourceDesign(pages,source,'inspired').pages;
 for(const page of generated){
  assert.match(page.html,/class="source-brand-logo"[^>]*loading="eager" fetchpriority="high"/);
 }
 assert.match(generated[0].html,/src="https:\/\/market\.example\/grand-opening\.jpg"[^>]*loading="eager" fetchpriority="high"/);
 assert.match(generated[1].html,/src="https:\/\/market\.example\/wings\.jpg"[^>]*loading="lazy"/);
 assert.doesNotMatch(generated[1].html,/src="https:\/\/market\.example\/wings\.jpg"[^>]*fetchpriority="high"/);
});

test('a generic retail redesign uses an advertised source category photo as its homepage hero',()=>{
 const source=extractWebsiteDesignDna(
  '<img src="/logo.png" alt="Retailer logo" class="brand-logo">'+
  '<img src="/kitchen.jpg" alt="Small Kitchen Appliances">'+
  '<img src="/headphones.jpg" alt="Wireless Headphones">'+
  '<img src="/fruit.jpg" alt="Fruit bowl">',
  'https://store.example/');
 const home=wrap('<section class="site-hero editorial text-led"><div><p class="eyebrow">Electronics Retail</p><h1>Store</h1><p>Browse computers, TVs, headphones and appliances.</p></div></section>');
 const services=wrap('<article><h2>Wireless Headphones</h2></article>');
 const result=applySourceDesign([{slug:'index',title:'Home',html:home},{slug:'services',title:'Products',html:services}],source,'redesign');
 assert.match(result.pages[0].html,/class="site-hero editorial image-led"/);
 assert.match(result.pages[0].html,/src="https:\/\/store\.example\/kitchen\.jpg"[^>]*loading="eager"/);
 assert.match(result.pages[1].html,/src="https:\/\/store\.example\/headphones\.jpg"/);
 assert.doesNotMatch(result.pages[0].html,/src="https:\/\/store\.example\/fruit\.jpg"/);
 const preserved=applySourceDesign([{slug:'index',title:'Home',html:home}],source,'inspired');
 assert.doesNotMatch(preserved.pages[0].html,/data-forge-source-figure/);
});


test('enclosing observed retail catalog labels recover distinct offering photographs with blank alt text',()=>{
 const source=extractWebsiteDesignDna(
  '<a href="/headphones" aria-label="Shop Wireless Headphones"><img src="/headphones.webp" alt=""></a>'+
  '<a href="/appliances" aria-label="Small Kitchen Appliances"><img src="/appliances.webp" alt=""></a>'+
  '<a href="/unrelated" aria-label="Fruit Bowls"><img src="/fruit.webp" alt=""></a>',
  'https://retail.example/');
 const site=applySourceDesign([{slug:'services',title:'Products',html:wrap(
  '<article class="service-card"><h2>Wireless Headphones</h2></article>'+
  '<article class="service-card"><h2>Kitchen Appliances</h2></article>')}],source,'redesign').pages[0].html;
 assert.match(site,/src="https:\/\/retail\.example\/headphones\.webp"/);
 assert.match(site,/src="https:\/\/retail\.example\/appliances\.webp"/);
 assert.doesNotMatch(site,/src="https:\/\/retail\.example\/fruit\.webp"/);
 assert.equal((site.match(/data-forge-source-image/g)||[]).length,2);
});


test('redesign without an observed official logo retains a wordmark, not a synthetic initial icon',()=>{
 const source=extractWebsiteDesignDna('<img src="/appliances.jpg" alt="Kitchen Appliances">','https://retail.example/');
 const original={slug:'index',title:'Home',html:wrap('<h1>Kitchen Appliances</h1>')};
 const result=applySourceDesign([original],source,'redesign');
 assert.match(result.pages[0].html,/>Pizza<\/a>/,'visible business-name wordmark is retained');
 assert.doesNotMatch(result.pages[0].html,/<span class="brand-mark">P<\/span>/,'fabricated initial is suppressed');
 assert.ok(result.warnings.some(text=>text.includes('without fabricating a logo')));
 assert.match(original.html,/<span class="brand-mark">P<\/span>/,'input is not mutated');
 const newSite=applySourceDesign([original],source,'new');
 assert.match(newSite.pages[0].html,/<span class="brand-mark">P<\/span>/,'new brand design remains unchanged');
});
test('source logos still replace generated initials and meaningful multi-letter brand marks survive',()=>{
 const original={slug:'index',title:'Home',html:wrap('<h1>Pizza</h1>')};
 const observed=applySourceDesign([original],dna,'redesign').pages[0].html;
 assert.match(observed,/class="source-brand-logo"/);
 assert.doesNotMatch(observed,/<span class="brand-mark">P<\/span>/);
 const noOfficialLogo=extractWebsiteDesignDna('<h1>Retail</h1>','https://retail.example/');
 const deliberate={...original,html:original.html.replace('<span class="brand-mark">P</span>','<span class="brand-mark">BB</span>')};
 const kept=applySourceDesign([deliberate],noOfficialLogo,'redesign').pages[0].html;
 assert.match(kept,/<span class="brand-mark">BB<\/span>/);
});


test('unmatched source photo highlights precede text-only offering cards without impersonating their topics',()=>{
 const base=extractWebsiteDesignDna('<meta property="og:site_name" content="Fictional Media">','https://media.example/');
 const source={...base,images:[
  'Animated family gathered at a rocky coastal shoreline',
  'Illustrated science fiction characters near a spacecraft',
  'A black animated cat against a vibrant blue background',
  'An elaborate snow-covered fantasy palace at night',
  'Brightly colored creatures in an enchanted forest'
 ].map((alt,i)=>({url:'https://media.example/gallery-'+i+'.jpg',alt,role:'content' as const,sourcePage:'https://media.example/',width:1200,height:720}))};
 const cards=['More streaming stories','Vacation destinations','Studio partners'].map(label=>
  '<article class="card service-card"><h2>'+label+'</h2><p>Explore the topic.</p></article>').join('');
 const page={slug:'index',title:'Home',html:wrap(
  '<section class="site-hero"><h1>Fictional Media</h1></section>'+
  '<section class="section-heading"><h2>Discover more.</h2></section><div class="cards">'+cards+'</div>'
 )};
 const result=applySourceDesign([page],source,'redesign').pages[0].html;
 const galleryIndex=result.indexOf('data-forge-source-highlights'),headingIndex=result.indexOf('class="section-heading"');
 assert.ok(galleryIndex>=0,'A genuine source-photo gallery is available');
 assert.ok(galleryIndex<headingIndex,'Visual source highlights appear before image-poor topic tiles');
 const gallery=result.match(/<section class="source-highlights"[\s\S]*?<\/section>/)?.[0]||'';
 assert.match(gallery,/Animated family gathered at a rocky coastal shoreline/,'Original descriptive alt survives');
 assert.ok((gallery.match(/data-forge-source-image/g)||[]).length>=2,'Multiple original photos are retained');
 for(const card of result.match(/<article class="card service-card">[\s\S]*?<\/article>/g)||[]){
  assert.doesNotMatch(card,/<img\b/,'An unrelated photo must not claim a topic');
 }
});

test('fully illustrated offering cards never receive a redundant source gallery',()=>{
 const source=extractWebsiteDesignDna(
  '<img src="/one.jpg" alt="Mountain landscape in morning light"><img src="/two.jpg" alt="Forest trail in afternoon sunshine">',
  'https://media.example/');
 const cards=['A','B','C'].map((name,i)=>
  '<article class="card service-card"><img src="https://stock.example/'+i+'.jpg" alt="Photo"><h2>'+name+'</h2></article>').join('');
 const result=applySourceDesign([{slug:'index',title:'Home',html:wrap('<div class="cards">'+cards+'</div>')}],source,'redesign');
 assert.doesNotMatch(result.pages[0].html,/data-forge-source-highlights/);
});
