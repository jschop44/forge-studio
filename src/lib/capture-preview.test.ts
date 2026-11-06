import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePreviewPages} from './capture-preview';

const evidence={
 version:1,sourceUrl:'https://example.com',capturedAt:'2026-11-06T20:00:00.000Z',
 viewport:{width:1280,height:800},warnings:[],
 pages:[{path:'/',title:'Example <script>alert(1)</script>',landmarks:[],interactions:[],
 visualRegions:[{role:'hero',x:0,y:0,width:1200,height:300,text:'Hello <img src=x onerror=alert(1)>'}]}]
};
test('creates an isolated review-only preview from validated browser evidence',()=>{
 const pages=capturePreviewPages(evidence);
 assert.equal(pages.length,1);
 assert.equal(pages[0].slug,'index');
 assert.match(pages[0].html,/Content-Security-Policy/);
 assert.match(pages[0].html,/&lt;script&gt;/);
 assert.match(pages[0].html,/&lt;img/);
 assert.doesNotMatch(pages[0].html,/<script|<img/i);
});
test('rejects invalid captures before rendering',()=>{
 assert.throws(()=>capturePreviewPages({...evidence,sourceUrl:'http://localhost'}));
 assert.throws(()=>capturePreviewPages({...evidence,pages:[]}));
});

test('orders observed regions by screen position and preserves bounded heights',()=>{
 const input={...evidence,pages:[{...evidence.pages[0],visualRegions:[
  {role:'section',x:0,y:350,width:800,height:300,text:'Second'},
  {role:'hero',x:0,y:0,width:800,height:120,text:'First'}
 ]}]};
 const html=capturePreviewPages(input)[0].html;
 assert.ok(html.indexOf('First')<html.indexOf('Second'));
 assert.match(html,/min-height:120px/);
 assert.match(html,/min-height:300px/);
});
