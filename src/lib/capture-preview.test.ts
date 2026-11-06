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

test('renders distinct captured pages and preserves bounded horizontal positions',()=>{
 const second={...evidence.pages[0],path:'/about',title:'About',visualRegions:[{role:'section',x:320,y:0,width:640,height:100,text:'About content'}]};
 const input={...evidence,pages:[evidence.pages[0],second]};
 const pages=capturePreviewPages(input);
 assert.equal(pages.length,2);
 assert.equal(pages[1].slug,'capture-2');
 assert.match(pages[1].html,/About content/);
 assert.match(pages[1].html,/width:50%;margin-left:25%/);
 assert.match(pages[1].html,/@media\(max-width:650px\)/);
});
