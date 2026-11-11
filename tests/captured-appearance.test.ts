import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';

const sample={version:1,sourceUrl:'https://studio.example/',capturedAt:'2026-11-10T18:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{path:'/',title:'Studio',landmarks:[],interactions:[],designTokens:{backgroundColor:'rgb(239, 241, 244)',textColor:'rgb(34, 43, 51)',fontFamily:'"Avenir Next", Arial, sans-serif',headingFontFamily:'Georgia, serif',headingFontSize:'64px',baseFontSize:'16px'}}]};
const pages=[{slug:'index',html:'<html><head><title>Studio</title></head><body><h1>Studio</h1></body></html>'},{slug:'services',html:'<html><head></head><body>Service</body></html>'}];
test('preserve mode applies computed source colors and typography across all pages without source scripts',()=>{
 const result=applyCapturedAppearance(pages,sample,'https://studio.example/','inspired');
 assert.equal(result.pages.length,2);
 for(const page of result.pages){
  assert.match(page.html,/--business-paper:#eff1f4/);
  assert.match(page.html,/--business-ink:#222b33/);
  assert.match(page.html,/font-family:"Avenir Next",sans-serif/);
  assert.match(page.html,/h1,h2,h3\{font-family:"Georgia",sans-serif/);
  assert.match(page.html,/h1\{font-size:clamp\(2rem,6vw,64px\)/);
  assert.equal((page.html.match(/id="forge-captured-appearance"/g)||[]).length,1);
 }
 const repeated=applyCapturedAppearance(result.pages,sample,sample.sourceUrl,'inspired');
 assert.equal((repeated.pages[0].html.match(/id="forge-captured-appearance"/g)||[]).length,1);
 assert.equal(pages[0].html.includes('forge-captured-appearance'),false);
 assert.ok(result.warnings.some(w=>w.includes('unverified')));
});
test('redesign and scratch creation never import browser styles',()=>{
 assert.deepEqual(applyCapturedAppearance(pages,sample,sample.sourceUrl,'redesign'),{pages,warnings:[]});
 assert.deepEqual(applyCapturedAppearance(pages,sample,sample.sourceUrl,'new'),{pages,warnings:[]});
});
test('mismatched or invalid captures cannot style another company',()=>{
 const other=applyCapturedAppearance(pages,sample,'https://other.example/','inspired');
 assert.deepEqual(other.pages,pages);assert.ok(other.warnings.length>0);
 const poisoned={...sample,sourceUrl:'https://127.0.0.1/'};
 assert.deepEqual(applyCapturedAppearance(pages,poisoned,sample.sourceUrl,'inspired').pages,pages);
});
test('unrelated page styling is rejected even when the capture shares the same domain',()=>{
 const otherPage={...sample,pages:[{...sample.pages[0],path:'/unrelated'}]};
 const result=applyCapturedAppearance(pages,otherPage,sample.sourceUrl,'inspired');
 assert.deepEqual(result.pages,pages);
 assert.ok(result.warnings.some(w=>w.includes('inspected source page')));
 const capturedQuery={...sample,pages:[{...sample.pages[0],path:'/?catalog=1'}]};
 const withQuery=applyCapturedAppearance(pages,capturedQuery,'https://studio.example/?catalog=1','inspired');
 assert.match(withQuery.pages[0].html,/forge-captured-appearance/);
});

test('low-contrast observed text is corrected and invalid CSS tokens are rejected before use',()=>{
 const valid={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,backgroundColor:'rgb(254, 254, 254)',textColor:'rgb(250, 250, 250)'}}]};
 const result=applyCapturedAppearance(pages,valid,sample.sourceUrl,'inspired');
 assert.match(result.pages[0].html,/--business-paper:#fefefe/);
 assert.match(result.pages[0].html,/--business-ink:#000000/);
 const attack={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,fontFamily:'Arial;}</style><script>alert(1)</script>',headingFontFamily:'url(javascript:bad)',headingFontSize:'1000px',baseFontSize:'6px'}}]};
 const rejected=applyCapturedAppearance(pages,attack,sample.sourceUrl,'inspired');
 assert.deepEqual(rejected.pages,pages,'malformed browser style evidence must not be partially applied');
 assert.ok(rejected.warnings.some(w=>w.includes('Unverified')));
 const unsafe={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,backgroundColor:'red;}script{display:block'}}]};
 assert.deepEqual(applyCapturedAppearance(pages,unsafe,sample.sourceUrl,'inspired').pages,pages);
});
