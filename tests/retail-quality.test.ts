import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBusinessOfferings,inferBusinessBrief} from '../src/lib/business-brief';
import {industryPhotos,photoIdentity} from '../src/lib/industry-photos';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {readableAccent,colorContrast} from '../src/lib/readable-accent';
import {visualSubjectTerms,relevantVisualAssets} from '../src/lib/visual-assets';
test('navigation fallbacks never masquerade as products in any niche',()=>{
 assert.deepEqual(inferBusinessBrief('Toys','Industry: Toy retail').services,['Toys']);
 assert.deepEqual(normalizeBusinessOfferings('Toy retail',['Explore services','Discuss your project','Contact the team']),['Toys']);
 assert.deepEqual(normalizeBusinessOfferings('Handmade pottery retail',['Browse Ceramic bowls','About our business','Ceramic bowls']),['Ceramic bowls']);
 assert.deepEqual(normalizeBusinessOfferings('Healthcare',['Contact lens fitting','Vaccinations']),['Contact lens fitting','Vaccinations']);
});
test('pale model accents cannot make light-page labels unreadable',()=>{
 for(const accent of ['#e3c89e','#9ee3bf','#9ed8f5'])for(const background of ['#fff8ef','#f0edf4','#102b2a']){
  const color=readableAccent(accent,background,'#183c3a');assert.ok(colorContrast(color,background)>=4.5);
 }
});
test('toy retail has four distinct photos and useful product headings without invented inventory',()=>{
 const photos=industryPhotos('Toy retail');assert.equal(photos.length,4);assert.equal(industryPhotos('Kids toys retail').length,4);
 assert.equal(industryPhotos('Toy medical equipment').length,0);
 const site=generateBusinessWebsite({businessName:'Toys',industry:'Toy retail',description:'Kids toys and merchandise for browsing.',services:['Explore services','Discuss your project','Contact the team'],accent:'#e3c89e'});
 const used=site.pages.map(p=>p.html.match(/<figure class="editorial-photo"><img src="([^"]+)"/)?.[1]);assert.equal(new Set(used.filter((url):url is string=>Boolean(url)).map(photoIdentity)).size,4);
 const products=site.pages.find(p=>p.slug==='services')!;assert.ok(products.html.includes('<h2>Toys</h2>'));assert.ok(!products.html.includes('Explore Explore'));assert.ok(!products.html.includes('<h2>Explore services</h2>'));assert.ok(products.html.includes('Susan Holt Simpson'));
});
test('visual search removes business-role words while retaining actual niche specificity',()=>{
 assert.deepEqual(visualSubjectTerms('Toy retail'),['toy']);assert.deepEqual(visualSubjectTerms('Pediatric healthcare'),['pediatric','healthcare']);
 assert.equal(relevantVisualAssets('Toy retail',[{url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Toy.jpg',title:'Wooden toy blocks',credit:'Photographer',source:'https://commons.wikimedia.org/wiki/File:Toy.jpg',license:'CC BY 4.0'}]).length,1);
});

test('broader toy discovery still rejects explicit adult image metadata',()=>{
 const source={url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Toy.jpg',credit:'Photographer',source:'https://commons.wikimedia.org/wiki/File:Toy.jpg',license:'CC BY 4.0'};
 for(const title of ['Sex_toy','Toy dildo','Toy with nude model'])assert.equal(relevantVisualAssets('Toy retail',[{...source,title}]).length,0);
});
