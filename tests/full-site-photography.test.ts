import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {inspectGeneratedPages} from '../src/lib/auto-correction';
test('all seven acceptance categories retain distinct supplied photos on all four pages',()=>{
 for(const industry of ['Baseball equipment and memorabilia','Coffee shop','Restaurant','Healthcare','Accounting and bookkeeping','Retail','Plumbing']){
  const visualAssets=Array.from({length:4},(_,i)=>({url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/subject-'+i+'.jpg',title:industry+' photography '+i,credit:'Photographer',source:'https://commons.wikimedia.org/wiki/File:Subject-'+i+'.jpg',license:'CC0'}));
  const site=generateBusinessWebsite({businessName:'Northstar',industry,description:'A trusted local business providing specialized products and services to the community.',services:['Products'],visualAssets,experienceStyle:'standard'});
  assert.deepEqual(inspectGeneratedPages(site.pages),[],industry);
  const photos=site.pages.map(page=>page.html.match(/<figure class="editorial-photo"><img src="([^"]+)"/)?.[1]);
  assert.equal(new Set(photos).size,4,industry);assert.ok(photos.every(Boolean),industry);
 }
});
test('object navigation keeps photographs alongside useful interactive navigation',()=>{
 const site=generateBusinessWebsite({businessName:'Coffee House',industry:'Coffee shop',description:'Fresh coffee and roasted beans for the local community.',services:['Coffee beans','Espresso'],experienceStyle:'object-navigation'});
 assert.ok(site.pages.every(page=>/<img\b/.test(page.html)));
 assert.match(site.pages[0].html,/forge-object-navigation/);
});
