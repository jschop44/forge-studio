import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceToBlueprint} from '../workers/evidence-to-blueprint.mjs';
test('transforms observed regions into a bounded editable blueprint',()=>{
 const result=evidenceToBlueprint({version:1,sourceUrl:'https://example.com/page',capturedAt:'2026-11-06T00:00:00Z',pages:[{title:' Example ',landmarks:[{role:'h1',text:'Welcome'}],visualRegions:[{role:'hero',text:'Hello',x:0,y:0,width:800,height:200},{role:'section',text:'Details',x:0,y:200,width:800,height:300},{role:'section',x:-1,y:0,width:5,height:5}],interactions:[{kind:'link',label:'About',target:'/about'}]}]});
 assert.equal(result.title,'Example');assert.equal(result.headline,'Welcome');assert.equal(result.sections.length,2);assert.equal(result.sections[0].type,'hero');assert.equal(result.navigation[0].verified,false);assert.equal(result.provenance.generatedContent,false);
});
test('rejects malformed evidence and unsafe sources',()=>{
 for(const input of [null,{}, {version:1,sourceUrl:'http://example.com',pages:[{visualRegions:[]}]},{version:1,sourceUrl:'https://example.com',pages:[{}]}])assert.throws(()=>evidenceToBlueprint(input));
});
