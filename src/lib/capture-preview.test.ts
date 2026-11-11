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

test('does not render links from protocol-relative captured page paths',()=>{
 const input={...evidence,pages:[{...evidence.pages[0],path:'//evil.example/steal',interactions:[
  {kind:'link',label:'Unsafe inherited base',target:'contact',verified:false}
 ]}]};
 const html=capturePreviewPages(input)[0].html;
 assert.doesNotMatch(html,/href="https:\/\/evil\.example/);
 assert.doesNotMatch(html,/Unsafe inherited base/);
});

test('discloses viewport dimensions, warnings and publication limitations',()=>{
 const input={...evidence,warnings:['Some elements were inaccessible']};
 const html=capturePreviewPages(input)[0].html;
 assert.match(html,/1280 × 800/);
 assert.match(html,/Capture warnings: 1/);
 assert.match(html,/Do not publish without review/);
 assert.match(html,/Interactive controls, fonts, colors and visual fidelity are not verified/);
});

test('optional preview depth respects reduced motion and hover capability',()=>{
 const html=capturePreviewPages(evidence)[0].html;
 assert.match(html,/@media\(hover:hover\) and \(prefers-reduced-motion:no-preference\)/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/transition:none;transform:none!important/);
});


test('renders sanitized computed font and color evidence without executing captured CSS',()=>{
 const tokenPage={...evidence.pages[0],designTokens:{backgroundColor:'rgb(20, 34, 48)',textColor:'rgb(245, 245, 245)',fontFamily:'"Source Sans", sans-serif',headingFontFamily:'Georgia, serif',headingFontSize:'44px',baseFontSize:'16px'}};
 const html=capturePreviewPages({...evidence,pages:[tokenPage]})[0].html;
 assert.match(html,/data-forge-computed-style/);
 assert.match(html,/body\{background:rgb\(20, 34, 48\);color:rgb\(245, 245, 245\)/);
 assert.match(html,/font-family:"Source Sans", sans-serif/);
 assert.match(html,/Observed computed colors and fonts are approximated/);
 assert.match(html,/Do not publish without review/);
 assert.doesNotMatch(html,/<script\b/i);
});
test('rejects untrusted computed CSS before an isolated preview is rendered',()=>{
 const bad={...evidence.pages[0],designTokens:{backgroundColor:'rgb(0,0,0);}</style><script>alert(1)</script>',textColor:'#fff',fontFamily:'Arial',headingFontFamily:'Georgia',headingFontSize:'40px',baseFontSize:'16px'}};
 assert.throws(()=>capturePreviewPages({...evidence,pages:[bad]}),/Invalid browser evidence/);
});
