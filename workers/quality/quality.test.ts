import {test} from 'node:test';
import assert from 'node:assert/strict';
import {qualityGraph} from './server';
const image='<img alt="Product" width="10" height="10" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22%3E%3C/svg%3E">';
test('LangGraph renders, repairs title metadata, and rechecks both viewports',{timeout:30000},async()=>{
 const html='<!doctype html><html lang="en"><head></head><body><main><h1>Shop</h1>'+image+'</main></body></html>';
 const result=await qualityGraph.invoke({pages:[{slug:'index',title:'Shop',html}],attempts:0,findings:[]},{recursionLimit:8});
 assert.equal(result.attempts,1);assert.equal(result.findings.length,0);assert.match(result.pages[0].html,/<title>Shop<\/title>/);
});
test('unrepairable broken navigation blocks acceptance without futile retries',{timeout:30000},async()=>{
 const html='<!doctype html><html lang="en"><head><title>Shop</title></head><body><main style="width:200vw"><h1>Shop</h1>'+image+'<a href="missing.html">Products</a></main></body></html>';
 const result=await qualityGraph.invoke({pages:[{slug:'index',title:'Shop',html}],attempts:0,findings:[]},{recursionLimit:8});
 assert.equal(result.attempts,0);assert.ok(result.findings.some(f=>f.kind==='broken-link'));assert.ok(result.findings.some(f=>f.kind==='horizontal-overflow'));
});

test('isolated browser repairs a clipped phone heading using the fixed safe patch',{timeout:30000},async()=>{
 const html='<!doctype html><html lang="en"><head><title>Shop</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><h1 style="width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Very long recovery collection headline</h1>'+image+'</main></body></html>';
 const result=await qualityGraph.invoke({pages:[{slug:'index',title:'Shop',html}],attempts:0,findings:[]},{recursionLimit:8});
 assert.equal(result.attempts,1);
 assert.equal(result.findings.length,0);
 assert.match(result.pages[0].html,/id="forge-mobile-heading-repair"/);
 assert.match(result.pages[0].html,/white-space:normal!important/);
});
test('unfixable clipped headings remain quality failures after one bounded correction',{timeout:30000},async()=>{
 const html='<!doctype html><html lang="en"><head><title>Shop</title></head><body><main><h1 style="position:relative;left:-180px">Product name</h1>'+image+'</main></body></html>';
 const result=await qualityGraph.invoke({pages:[{slug:'index',title:'Shop',html}],attempts:0,findings:[]},{recursionLimit:8});
 assert.equal(result.attempts,1);
 assert.ok(result.findings.some(f=>f.kind==='clipped-heading'));
 assert.match(result.pages[0].html,/id="forge-mobile-heading-repair"/);
});
