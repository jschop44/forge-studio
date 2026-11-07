import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {generateBusinessWebsite} from './business-site';
const brief=(industry:string)=>({businessName:'Example Business',industry,description:'A neighborhood business serving its local community.',services:['Customer support','Information']});
test('retail websites receive products navigation and relevant call to action',()=>{const site=generateBusinessWebsite(brief('Sporting goods retail'));assert.match(site.pages[0].html,/>Products<\/a>/);assert.match(site.pages[0].html,/>Explore products<\/a>/);assert.equal(site.pages[1].title,'Products')});
test('medical websites receive care-specific navigation',()=>{const site=generateBusinessWebsite(brief('Healthcare and medical services'));assert.match(site.pages[0].html,/Care &amp; services/)});
test('family-friendly seasonal themes never produce undefined image URLs',()=>{const site=generateBusinessWebsite(brief('Halloween family festival'));assert.doesNotMatch(site.pages[0].html,/src="undefined"|url\("undefined"\)/)});
