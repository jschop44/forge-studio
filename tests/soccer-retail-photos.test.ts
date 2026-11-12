import {test} from 'node:test';
import assert from 'node:assert/strict';
import {industryPhotos,photoIdentity} from '../src/lib/industry-photos';
import {inferBusinessBrief} from '../src/lib/business-brief';
import {generateBusinessWebsite} from '../src/lib/business-site';
test('soccer sports memorabilia keeps distinct niche photos and product navigation',()=>{
 const industry='Soccer sports memorabilia';const photos=industryPhotos(industry);
 assert.equal(new Set(photos.map(photoIdentity)).size,4);
 assert.equal(industryPhotos('Soccer medical equipment').length,0);
 const input=inferBusinessBrief('Soccer','Industry: '+industry);
 assert.ok(input.services.some(s=>/memorabilia/.test(s)));assert.ok(!input.services.some(s=>/training|match information/i.test(s)));
 const site=generateBusinessWebsite({...input,experienceStyle:'standard'});
 assert.equal(site.pages.find(p=>p.slug==='services')?.title,'Products');
 const seen=new Set<string>();
 for(const page of site.pages){
  const image=page.html.match(/<figure class="editorial-photo"><img src="([^"]+)"/);
  assert.ok(image,page.slug+' must have a photo');seen.add(photoIdentity(image[1]));
  assert.ok(page.html.includes('href="services.html">Products</a>'));assert.ok(!page.html.includes('Ask about this service'));
 }
 assert.equal(seen.size,4);assert.ok(site.pages[0].html.includes('Explore products'));assert.ok(site.pages[0].html.includes('.site-hero>.editorial-photo{grid-row:1'));
});
test('one discovered soccer asset does not remove photographs from the remaining pages',()=>{
 const source='https://upload.wikimedia.org/wikipedia/commons/a/ab/Soccer.jpg';
 const site=generateBusinessWebsite({businessName:'Soccer',industry:'Soccer sports memorabilia',description:'Soccer memorabilia and equipment for collectors.',services:['Soccer memorabilia'],visualAssets:[{url:source,title:'Soccer sports memorabilia',source:'https://commons.wikimedia.org/wiki/File:Soccer.jpg',credit:'Test photographer',license:'CC BY 4.0'}]});
 const photos=site.pages.map(p=>p.html.match(/<figure class="editorial-photo"><img src="([^"]+)"/)?.[1]);
 assert.equal(photos[0],source);assert.equal(new Set(photos.filter(Boolean).map(photoIdentity)).size,4);
});
