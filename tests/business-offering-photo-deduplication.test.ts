import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';

function cardPhotoUrls(html:string):string[]{
 return [...html.matchAll(/<img\b[^>]*class="service-photo"[^>]*src="([^"]+)"/gi)]
  .map(match=>match[1].replace(/&amp;/g,'&').split('?')[0]);
}

test('catalog photos do not repeat on the homepage teaser cards',()=>{
 const site=generateBusinessWebsite({
  businessName:'Neighborhood Coffee Roasters',
  industry:'Coffee shop and cafe',
  description:'A friendly neighborhood coffee shop serving espresso drinks, roasted beans and pastries.',
  services:['Coffee beans','Espresso drinks','Pastries'],
  experienceStyle:'standard'
 });
 const home=site.pages.find(page=>page.slug==='index');
 const catalog=site.pages.find(page=>page.slug==='services');
 assert.ok(home&&catalog);
 const catalogPhotos=cardPhotoUrls(catalog.html);
 const homePhotos=cardPhotoUrls(home.html);
 assert.ok(homePhotos.length>=2,'homepage should retain available subject-matched offering images');
 assert.match(catalog.html,/<img\b/,'detailed catalog still contains primary photography');
 const all=[...catalogPhotos,...homePhotos];
 assert.equal(new Set(all).size,all.length,'offerings must not repeat an image across the generated pages');
 assert.match(home.html,/href="services\.html"/,'homepage still links to its full catalog');
 assert.match(catalog.html,/Espresso drinks/,'offering copy must survive photo allocation');
});

test('available catalog photography takes priority over repeating teaser images',()=>{
 const site=generateBusinessWebsite({
  businessName:'Coffee Counter',
  industry:'Coffee shop and cafe',
  description:'Serving small batch coffee beans and brewed espresso for the neighborhood.',
  services:['Coffee beans','Coffee bean roasting'],
  experienceStyle:'standard'
 });
 const catalog=site.pages.find(page=>page.slug==='services')!;
 const home=site.pages.find(page=>page.slug==='index')!;
 const catalogPhotos=cardPhotoUrls(catalog.html);
 const homepagePhotos=cardPhotoUrls(home.html);
 assert.ok(homepagePhotos.length>=1,'homepage offering image coverage must remain intact');
 assert.ok(catalogPhotos.every(url=>!homepagePhotos.includes(url)));
 assert.match(catalog.html,/Coffee beans/,'catalog copy remains navigable even when photos are scarce');
});
