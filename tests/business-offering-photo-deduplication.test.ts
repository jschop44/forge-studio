import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';

function cardPhotoUrls(html:string):string[]{
 return [...html.matchAll(/<img\b[^>]*class="service-photo"[^>]*src="([^"]+)"/gi)]
  .map(match=>match[1].replace(/&amp;/g,'&').split('?')[0]);
}

test('homepage and catalog use different matching photos when alternatives are licensed',()=>{
 // Synthetic licensed-asset fixture: never fetched or shown to real site visitors.
 const assets=[101,102,103,104].map(id=>({
  url:'https://images.pexels.com/photos/'+id+'/pexels-photo-'+id+'.jpeg',
  title:'Coffee shop coffee beans display '+id,
  source:'https://www.pexels.com/photo/coffee-shop-beans-'+id+'/',
  credit:'Test photographer',license:'Pexels License'
 }));
 const site=generateBusinessWebsite({
  businessName:'Sample Coffee',industry:'Coffee shop',
  description:'A neighborhood shop specializing in fresh coffee beans and quality espresso.',
  services:['Coffee beans'],visualAssets:assets,experienceStyle:'standard'
 });
 const home=site.pages.find(page=>page.slug==='index')!;
 const catalog=site.pages.find(page=>page.slug==='services')!;
 const homePhotos=cardPhotoUrls(home.html),catalogPhotos=cardPhotoUrls(catalog.html);
 assert.equal(homePhotos.length,1,'homepage card retains an image');
 assert.equal(catalogPhotos.length,1,'catalog card retains an image');
 assert.notEqual(homePhotos[0],catalogPhotos[0],'matching alternatives should prevent repeated card photos');
 assert.match(home.html,/href="services\.html"/);
 assert.match(catalog.html,/Coffee beans/);
});

test('scarce niche imagery remains visible on both pages when no alternate exists',()=>{
 const site=generateBusinessWebsite({
  businessName:'Neighborhood Bail Bonds',industry:'Bail bond services',
  description:'Information and support for people seeking bail bond services.',
  services:['Bail bonds'],experienceStyle:'standard'
 });
 const home=site.pages.find(page=>page.slug==='index')!;
 const catalog=site.pages.find(page=>page.slug==='services')!;
 assert.ok(cardPhotoUrls(home.html).length>=1,'do not remove homepage offering photography');
 assert.ok(cardPhotoUrls(catalog.html).length>=1,'do not remove catalog offering photography');
});
