import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';

const pages=[{slug:'index',html:'<html><head></head><body><h1>Shop</h1></body></html>'}];
const tokens={backgroundColor:'rgb(20, 34, 48)',textColor:'rgb(250, 250, 250)',fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',headingFontSize:'48px',baseFontSize:'16px'};
const capture={version:1,sourceUrl:'https://shop.example/',capturedAt:'2026-11-11T01:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{path:'/',title:'Shop home',landmarks:[],interactions:[],designTokens:tokens}]};

test('source-style preservation rejects styling from a different page on the same domain',()=>{
 const misleading={...capture,pages:[{...capture.pages[0],path:'/products'}]};
 const result=applyCapturedAppearance(pages,misleading,'https://shop.example/','inspired');
 assert.deepEqual(result.pages,pages);
 assert.ok(result.warnings.some(warning=>warning.includes('inspected source page')));
});
test('source-style preservation accepts an exact captured path including the original query',()=>{
 const evidence={...capture,pages:[{...capture.pages[0],path:'/catalog?type=coffee'}]};
 const found=applyCapturedAppearance(pages,evidence,'https://shop.example/catalog?type=coffee','inspired');
 assert.match(found.pages[0].html,/--business-paper:#142230/);
 const wrongQuery=applyCapturedAppearance(pages,evidence,'https://shop.example/catalog?type=baseball','inspired');
 assert.deepEqual(wrongQuery.pages,pages);
});
test('preserve mode still supports valid homepage captures, while redesign ignores them',()=>{
 const preserved=applyCapturedAppearance(pages,capture,capture.sourceUrl,'inspired');
 assert.match(preserved.pages[0].html,/forge-captured-appearance/);
 assert.deepEqual(applyCapturedAppearance(pages,capture,capture.sourceUrl,'redesign').pages,pages);
});


test('protocol-relative or missing page paths cannot supply a fallback style',()=>{
 const offsite={...capture,pages:[{...capture.pages[0],path:'//other.example/products'}]};
 assert.deepEqual(applyCapturedAppearance(pages,offsite,capture.sourceUrl,'inspired').pages,pages);
 const empty={...capture,pages:[]};
 assert.deepEqual(applyCapturedAppearance(pages,empty,capture.sourceUrl,'inspired').pages,pages);
});
