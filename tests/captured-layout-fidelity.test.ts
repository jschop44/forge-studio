import test from 'node:test';
import assert from 'node:assert/strict';
import {validCapturedDesignTokens,capturedTokensPreviewStyle} from '../src/lib/capture-style-tokens';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';
import {generateBusinessWebsite} from '../src/lib/business-site';

const tokens={
 backgroundColor:'rgb(250, 245, 231)',textColor:'rgb(28, 42, 36)',
 fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',
 headingFontSize:'52px',baseFontSize:'16px',
 heroTextAlign:'center' as const,heroLayout:'stacked' as const,
 contentMaxWidth:'960px',buttonRadius:'32px',
 buttonBackgroundColor:'rgb(34, 73, 54)',buttonTextColor:'rgb(255, 255, 255)',
 headerBackgroundColor:'rgb(251, 247, 235)'
};
const capture=(designTokens:unknown,source='https://source-store.example/')=>({
 version:1,sourceUrl:source,capturedAt:'2026-11-13T00:00:00Z',
 viewport:{width:1280,height:800},warnings:[],
 pages:[{path:'/',title:'The Source Shop',landmarks:[],interactions:[],designTokens}]
});

test('bounded observed width, button, nav, and hero layout are retained in preserve mode',()=>{
 assert.ok(validCapturedDesignTokens(tokens));
 const original=generateBusinessWebsite({businessName:'The Source Shop',industry:'Fresh produce retail',description:'A neighborhood market with seasonal produce, fresh fruit and gift baskets.',services:['Fresh fruit','Gift baskets'],experienceStyle:'standard'}).pages;
 const out=applyCapturedAppearance(original,capture(tokens),'https://source-store.example/','inspired');
 assert.equal(out.pages.length,4);
 for(const page of out.pages){
  assert.match(page.html,/id="forge-captured-appearance"/);
  assert.match(page.html,/body main\{max-width:960px;width:100%;margin-inline:auto\}/);
  assert.match(page.html,/body main \.site-hero:not\(\.text-led\)\{grid-template-columns:minmax\(0,1fr\);min-height:0\}/);
  assert.match(page.html,/body main \.site-hero>div\{text-align:center\}/);
  assert.match(page.html,/body \.button\{border-radius:32px\}/);
  assert.match(page.html,/body>nav\{background:#fbf7eb;color:#000000\}/);
 }
 const second=applyCapturedAppearance(out.pages,capture(tokens),'https://source-store.example/','preserve');
 assert.equal((second.pages[0].html.match(/id="forge-captured-appearance"/g)||[]).length,1);
 assert.equal(original[0].html.includes('forge-captured-appearance'),false);
 assert.ok(out.warnings.some(x=>x.includes('unverified')));
});

test('split hero layout is preserved at desktop but remains responsive on mobile',()=>{
 const split={...tokens,heroLayout:'split' as const,heroTextAlign:'left' as const};
 const result=applyCapturedAppearance([{slug:'index',html:'<html><head></head><body><main><section class="site-hero"><div></div></section></main></body></html>'}],capture(split),'https://source-store.example/','inspired');
 assert.match(result.pages[0].html,/@media\(min-width:701px\)\{body main \.site-hero:not\(\.text-led\)\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}\}/);
 assert.match(result.pages[0].html,/text-align:left/);
});

test('untrusted CSS or unbounded measurements invalidate the entire browser capture',()=>{
 const attacks=[
  {...tokens,buttonRadius:'9999px'},
  {...tokens,buttonBackgroundColor:'red;}</style><script>alert(1)</script>'},
  {...tokens,contentMaxWidth:'100vw'},
  {...tokens,heroTextAlign:'justify'},
  {...tokens,heroLayout:'grid;display:none'},
  {...tokens,headerBackgroundColor:'url(https://attacker.example/x)'}
 ];
 const pages=[{slug:'index',html:'<html><head></head><body><h1>Safe</h1></body></html>'}];
 for(const attempted of attacks){
  assert.equal(validCapturedDesignTokens(attempted),false);
  const result=applyCapturedAppearance(pages,capture(attempted),'https://source-store.example/','inspired');
  assert.deepEqual(result.pages,pages);
  assert.ok(result.warnings.some(x=>x.includes('Unverified')));
 }
 assert.match(capturedTokensPreviewStyle(tokens),/main\{max-width:100%;width:960px;margin-inline:auto\}/);
});

test('captured layout is never imported for a different source or into full redesign',()=>{
 const pages=[{slug:'index',html:'<html><head></head><body><h1>Safe</h1></body></html>'}];
 assert.deepEqual(applyCapturedAppearance(pages,capture(tokens),'https://different.example/','inspired').pages,pages);
 assert.deepEqual(applyCapturedAppearance(pages,capture(tokens),'https://source-store.example/','redesign').pages,pages);
 assert.deepEqual(applyCapturedAppearance(pages,capture(tokens),'https://source-store.example/','new').pages,pages);
});

test('subpages may retain their own computed geometry without altering the homepage',()=>{
 const other={...tokens,contentMaxWidth:'720px',buttonRadius:'8px',heroTextAlign:'right' as const};
 const observed={...capture(tokens),pages:[
  ...capture(tokens).pages,
  {path:'/catalog',title:'Catalog',landmarks:[],interactions:[],designTokens:other}
 ]};
 const pages=[
  {slug:'index',html:'<html><head></head><body><main></main></body></html>'},
  {slug:'catalog',html:'<html><head></head><body><main></main></body></html>'}
 ];
 const out=applyCapturedAppearance(pages,observed,'https://source-store.example/','inspired',{catalog:'https://source-store.example/catalog'});
 assert.match(out.pages[0].html,/max-width:960px/);
 assert.match(out.pages[1].html,/max-width:720px/);
 assert.match(out.pages[1].html,/border-radius:8px/);
 assert.match(out.pages[1].html,/text-align:right/);
});
