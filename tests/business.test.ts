import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
describe('website generation',()=>{
 it('produces four pages',()=>{const result=generateBusinessWebsite({businessName:'Example Company',industry:'Design',description:'We provide beautiful modern design services.',services:['Planning']});assert.equal(result.pages.length,4)});
 it('escapes HTML in names',()=>{const result=generateBusinessWebsite({businessName:'Company <script>',industry:'Design',description:'We provide beautiful modern design services.',services:['Planning']});assert.equal(result.pages[0].html.includes('Company <script>'),false)});
});
