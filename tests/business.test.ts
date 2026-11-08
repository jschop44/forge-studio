import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
describe('website generation',()=>{
 it('produces four pages',()=>{const result=generateBusinessWebsite({businessName:'Example Company',industry:'Design',description:'We provide beautiful modern design services.',services:['Planning']});assert.equal(result.pages.length,4)});
 it('uses distinct fallback imagery for different service cards',()=>{const result=generateBusinessWebsite({experienceStyle:'standard',businessName:'Neighborhood Cafe',industry:'Coffee shop',description:'Fresh drinks and welcoming experiences for our neighborhood.',services:['Morning specials','Afternoon favorites','Evening selections']});const home=result.pages.find(page=>page.slug==='index')!.html;const cards=[...home.matchAll(/<img class="service-photo" src="([^"]+)"/g)].map(match=>match[1]);assert.equal(cards.length,3);assert.equal(new Set(cards).size,3)});
 it('escapes HTML in names',()=>{const result=generateBusinessWebsite({businessName:'Company <script>',industry:'Design',description:'We provide beautiful modern design services.',services:['Planning']});assert.equal(result.pages[0].html.includes('Company <script>'),false)});
});
