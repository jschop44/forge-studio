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

test('clamps section width to the viewport and allows only same-origin HTTPS links',()=>{
 const input={...evidence,pages:[{...evidence.pages[0],visualRegions:[{role:'section',x:1000,y:0,width:280,height:100,text:'Right edge'}],interactions:[
  {kind:'link',label:'Contact <us>',target:'/contact',verified:false},
  {kind:'link',label:'Bad',target:'javascript:alert(1)',verified:false},
  {kind:'link',label:'External',target:'https://other.example/',verified:false}
 ]}]};
 const html=capturePreviewPages(input)[0].html;
 assert.match(html,/width:22%;margin-left:78%/);
 assert.match(html,/href="https:\/\/example.com\/contact"/);
 assert.match(html,/Contact &lt;us&gt;/);
 assert.doesNotMatch(html,/javascript:alert|other\.example/);
});

test('resolves relative navigation from the captured page and labels the page',()=>{
 const input={...evidence,pages:[{...evidence.pages[0],path:'/services/',title:'Services',interactions:[
  {kind:'link',label:'Details',target:'details',verified:false}
 ]}]};
 const pages=capturePreviewPages(input);
 assert.equal(pages[0].title,'Services');
 assert.match(pages[0].html,/href="https:\/\/example.com\/services\/details"/);
});
