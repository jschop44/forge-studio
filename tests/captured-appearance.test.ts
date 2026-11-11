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
  assert.match(page.html,/font-family:"Avenir Next","Arial",sans-serif/);
  assert.match(page.html,/h1,h2,h3\{font-family:"Georgia",serif/);
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
test('valid low-contrast computed colors retain readable text',()=>{
 const lowContrast={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,backgroundColor:'rgb(254, 254, 254)',textColor:'rgb(250, 250, 250)'}}]};
 const out=applyCapturedAppearance(pages,lowContrast,sample.sourceUrl,'inspired').pages[0].html;
 assert.match(out,/--business-paper:#fefefe/);
 assert.match(out,/--business-ink:#000000/);
});
test('rejects malformed browser evidence before CSS injection or unbounded font sizes',()=>{
 const attack={...sample,pages:[{...sample.pages[0],designTokens:{backgroundColor:'rgb(254, 254, 254)',textColor:'rgb(250, 250, 250)',fontFamily:'Arial;}</style><script>alert(1)</script>',headingFontFamily:'url(javascript:bad)',headingFontSize:'1000px',baseFontSize:'6px'}}]};
 const rejected=applyCapturedAppearance(pages,attack,sample.sourceUrl,'inspired');
 assert.deepEqual(rejected.pages,pages);
 assert.ok(rejected.warnings.some(w=>w.includes('Unverified browser appearance')));
 const unsafe={...sample,pages:[{...sample.pages[0],designTokens:{backgroundColor:'red;}script{display:block',textColor:'rgb(255, 255, 255)',fontFamily:'sans-serif'}}]};
 assert.deepEqual(applyCapturedAppearance(pages,unsafe,sample.sourceUrl,'inspired').pages,pages);
});

test('missing custom fonts retain the observed monospace and serif fallbacks',()=>{
 const evidence={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,fontFamily:'"Unavailable Business Font", "Courier New", monospace',headingFontFamily:'Missing Serif, ui-serif, Georgia, serif'}}]};
 const html=applyCapturedAppearance(pages,evidence,sample.sourceUrl,'preserve').pages[0].html;
 assert.match(html,/body\{font-family:"Unavailable Business Font","Courier New",monospace\}/);
 assert.match(html,/h1,h2,h3\{font-family:"Missing Serif",ui-serif,"Georgia",serif\}/);
});
test('a malformed or excessive font stack cannot leak raw CSS into generated pages',()=>{
 for(const fontFamily of ['Georgia,,serif',Array(9).fill('Arial').join(','),'Arial, "broken']){
  const evidence={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,fontFamily}}]};
  const html=applyCapturedAppearance(pages,evidence,sample.sourceUrl,'preserve').pages[0].html;
  assert.doesNotMatch(html,/body\{font-family:/);
  assert.match(html,/--business-paper:#eff1f4/);
 }
});

test('bounded computed line height improves source typography fidelity without unsafe CSS',()=>{
 const evidence={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,lineHeight:'27px'}}]};
 const output=applyCapturedAppearance(pages,evidence,sample.sourceUrl,'preserve').pages[0].html;
 assert.match(output,/body\{line-height:27px\}/);
 const malicious={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,lineHeight:'27px;}script{display:none'}}]};
 assert.deepEqual(applyCapturedAppearance(pages,malicious,sample.sourceUrl,'preserve').pages,pages);
 const absent=applyCapturedAppearance(pages,sample,sample.sourceUrl,'preserve').pages[0].html;
 assert.doesNotMatch(absent,/body\{line-height:/);
});

test('observed heading spacing is retained only when validated and bounded',()=>{
 const evidence={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,headingLineHeight:'72px'}}]};
 const html=applyCapturedAppearance(pages,evidence,sample.sourceUrl,'preserve').pages[0].html;
 assert.match(html,/h1\{line-height:72px\}/);
 const invalid={...sample,pages:[{...sample.pages[0],designTokens:{...sample.pages[0].designTokens,headingLineHeight:'72px;}body{display:none'}}]};
 assert.deepEqual(applyCapturedAppearance(pages,invalid,sample.sourceUrl,'preserve').pages,pages);
 assert.doesNotMatch(applyCapturedAppearance(pages,sample,sample.sourceUrl,'preserve').pages[0].html,/h1\{line-height:/);
});
