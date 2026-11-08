import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
test('all generated pages include dynamic reduced-motion control visibility',()=>{
 const site=generateBusinessWebsite({businessName:'Studio',industry:'Design',description:'An independent design studio.',services:['Design']});
 assert.equal(site.pages.length,4);
 for(const page of site.pages)assert.match(page.html,/@media\(prefers-reduced-motion:reduce\)\{\[aria-label="Immersive world movement"\]\{display:none!important\}/);
});
