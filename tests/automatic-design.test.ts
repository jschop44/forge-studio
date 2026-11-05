import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {industryPhotos} from '../src/lib/industry-photos';
import {generateBusinessWebsite} from '../src/lib/business-site';
describe('automatic visual website generation',()=>{
 it('selects industry-relevant image assets',()=>{assert.notDeepEqual(industryPhotos('pizza restaurant'),industryPhotos('automotive showroom'));assert.equal(industryPhotos('software studio').length,2)});
 it('builds four linked pages with photos, metadata and structured data',()=>{const site=generateBusinessWebsite({businessName:'Northstar Coffee',industry:'Cafe and restaurant',description:'A neighborhood coffee shop with fresh baked goods and espresso.',services:['Coffee','Catering']});assert.deepEqual(site.pages.map(p=>p.slug),['index','services','about','contact']);assert.ok(site.pages[0].html.includes('images.unsplash.com'));assert.ok(site.pages[1].html.includes('images.unsplash.com'));assert.ok(site.pages[0].html.includes('application/ld+json'));assert.ok(site.pages[0].html.includes('href="contact.html"'))});
});
