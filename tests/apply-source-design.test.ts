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

test('service photos are not replaced by unrelated source assets when a matching photo was used earlier',()=>{
 const source=extractWebsiteDesignDna('<img src="/wings.jpg" alt="Chicken wings"><img src="/fruit.jpg" alt="Fruit bowl">','https://restaurant.example/');
 const pages=[
  {slug:'index',title:'Chicken wings',html:wrap('<h1>Chicken wings</h1><figure class="editorial-photo"><img src="https://stock.example/wings.jpg" alt="Chicken wings"></figure>')},
  {slug:'services',title:'Menu',html:wrap('<article><h2>Chicken wings</h2><img src="https://stock.example/menu.jpg" alt="Menu photograph"></article>')}
 ];
 const result=applySourceDesign(pages,source,'redesign');
 assert.match(result.pages[0].html,/src="https:\/\/restaurant\.example\/wings\.jpg"/);
 assert.match(result.pages[1].html,/src="https:\/\/stock\.example\/menu\.jpg"/);
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
  {slug:'index',title:'Home',html:wrap('<h1>Welcome to our restaurant</h1>')},
  {slug:'services',title:'Menu',html:wrap('<article><h2>Chicken wings</h2><img src="https://stock.example/food.jpg"></article><article><h2>Pizza</h2><img src="https://stock.example/food2.jpg"></article>')},
  {slug:'about',title:'About',html:wrap('<h1>Our story</h1>')}
 ];
 const result=applySourceDesign(pages,siteDna,'redesign');
 assert.match(result.pages[1].html,/src="https:\/\/restaurant\.example\/wings\.jpg"/);
 assert.match(result.pages[1].html,/src="https:\/\/restaurant\.example\/pizza\.jpg"/);
 assert.doesNotMatch(result.pages[1].html,/src="https:\/\/restaurant\.example\/salad\.jpg"/);
 const photos=result.pages.flatMap(page=>[...page.html.matchAll(/data-forge-source-image src="([^"]+)"/g)].map(match=>match[1]).filter(url=>!url.endsWith('/logo.png')));
 assert.equal(new Set(photos).size,photos.length,'non-logo source images must remain unique across pages');
 for(const page of result.pages)assert.match(page.html,/src="https:\/\/restaurant\.example\/logo\.png"/);
});
