import test from 'node:test';
import assert from 'node:assert/strict';
import {validCapturedDesignTokens} from '../src/lib/capture-style-tokens';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';

const tokens={
 backgroundColor:'rgb(250, 245, 231)',textColor:'rgb(28, 42, 36)',
 fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',
 headingFontSize:'52px',baseFontSize:'16px',
 heroGap:'48px',heroPaddingTop:'88px',heroPaddingBottom:'72px',
 headerPaddingTop:'24px',headerPaddingBottom:'20px',heroMediaRadius:'26px'
};
const evidence=(designTokens:unknown)=>({
 version:1,sourceUrl:'https://client.example/',capturedAt:'2026-11-13T00:00:00Z',
 viewport:{width:1280,height:800},warnings:[],
 pages:[{path:'/',title:'Client',landmarks:[],interactions:[],designTokens}]
});
const pages=[{slug:'index',html:'<!doctype html><html><head></head><body><nav>Client</nav><main><section class="site-hero"><div><h1>Client</h1></div><figure class="editorial-photo"><img src="/picture.jpg"></figure></section></main></body></html>'}];

test('only measured, safely bounded pixel measurements may enter preserve style',()=>{
 assert.ok(validCapturedDesignTokens(tokens));
 for(const invalid of [
  {heroGap:'121px'},{heroPaddingTop:'241px'},{headerPaddingBottom:'97px'},
  {heroMediaRadius:'65px'},{heroGap:'clamp(1px,2vw,60px)'},
  {heroGap:'10px;}body{display:none'},{headerPaddingTop:'-10px'}
 ]){
  const captured={...tokens,...invalid};
  assert.equal(validCapturedDesignTokens(captured),false);
  const out=applyCapturedAppearance(pages,evidence(captured),'https://client.example/','preserve');
  assert.deepEqual(out.pages,pages);
 }
});

test('authorized source spacing is carried to generated and extracted hero templates',()=>{
 const result=applyCapturedAppearance(pages,evidence(tokens),'https://client.example/','preserve');
 const html=result.pages[0].html;
 assert.match(html,/body main \.site-hero,body main \.extracted-hero\{column-gap:48px\}/);
 assert.match(html,/body main \.site-hero,body main \.extracted-hero\{padding-top:88px\}/);
 assert.match(html,/body main \.site-hero,body main \.extracted-hero\{padding-bottom:72px\}/);
 assert.match(html,/body>nav\{padding-top:24px\}/);
 assert.match(html,/body>nav\{padding-bottom:20px\}/);
 assert.match(html,/body main \.site-hero \.editorial-photo img,body main \.extracted-hero img\{border-radius:26px\}/);
 assert.equal((html.match(/id="forge-captured-appearance"/g)||[]).length,1);
});

test('unavailable measurements are omitted and redesign is unchanged',()=>{
 const legacy={...tokens}; delete (legacy as Partial<typeof tokens>).heroGap;
 const html=applyCapturedAppearance(pages,evidence(legacy),'https://client.example/','preserve').pages[0].html;
 assert.doesNotMatch(html,/column-gap:48px/);
 assert.deepEqual(applyCapturedAppearance(pages,evidence(tokens),'https://client.example/','redesign').pages,pages);
 assert.deepEqual(applyCapturedAppearance(pages,evidence(tokens),'https://other.example/','preserve').pages,pages);
});
