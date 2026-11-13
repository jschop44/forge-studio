import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {correctGeneratedPages,inspectGeneratedPages} from './auto-correction';
const page=(html:string)=>({slug:'index',html});
test('finds absent photos and broken internal navigation',()=>{
 const findings=inspectGeneratedPages([page('<title>Site</title><a href="missing.html">Missing</a>')]);
 assert.ok(findings.some(f=>f.kind==='missing-image'));
 assert.ok(findings.some(f=>f.kind==='broken-link'));
});
test('repairs a site within bounded attempts',async()=>{
 const result=await correctGeneratedPages([page('<title>Site</title>')],async pages=>pages.map(p=>({...p,html:p.html+'<img src="https://images.example/photo.jpg" alt="Product">'})));
 assert.equal(result.passed,true);assert.equal(result.attempts,1);
});
test('stops on persistent quality defects',async()=>{
 const result=await correctGeneratedPages([page('<title>Site</title>')],async pages=>pages,2);
 assert.equal(result.passed,false);assert.equal(result.attempts,2);
});
test('rejects a repair that removes pages',async()=>{
 await assert.rejects(correctGeneratedPages([page('<title>Site</title>')],async()=>[]),/preserve page identities/);
});

test('inert quality findings include clipped headings without rewriting a business page',()=>{
 const html='<html><head><title>Shop</title></head><body><h1>Recovery wraps</h1><img alt="Wrap" src="data:image/svg+xml,ok"></body></html>';
 const findings=inspectGeneratedPages([{slug:'index',html,clippedHeadings:['h1 heading 1 is clipped at 390px']}]);
 assert.ok(findings.some(f=>f.kind==='clipped-heading'&&f.detail.includes('390px')));
});
