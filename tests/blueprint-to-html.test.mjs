import test from 'node:test';
import assert from 'node:assert/strict';
import {blueprintToHtml,blueprintToPages} from '../workers/blueprint-to-html.mjs';
test('renders a self-contained responsive preview',()=>{
 const html=blueprintToHtml({version:1,title:'Test',headline:'Welcome',sections:[{type:'hero',headline:'Hello'}]});
 assert.match(html,/<!doctype html>/);assert.match(html,/viewport/);assert.match(html,/Hello/);assert.match(html,/Content-Security-Policy/);
});
test('escapes untrusted source content without executing scripts',()=>{
 const html=blueprintToHtml({version:1,title:'<script>alert(1)</script>',headline:'<img src=x onerror=alert(1)>',sections:[{type:'content',headline:'<svg onload=alert(1)>'}]});
 assert.doesNotMatch(html,/<script|<img|<svg/i);assert.match(html,/&lt;script&gt;/);
});
test('rejects invalid blueprints',()=>assert.throws(()=>blueprintToHtml({version:2,sections:[]})));

test('keeps observed navigation same-origin and escapes link text',()=>{
 const html=blueprintToHtml({version:1,sourceUrl:'https://example.com',title:'Example',sections:[],navigation:[{label:'About <us>',target:'/about'},{label:'External',target:'https://evil.example/'},{label:'Unsafe',target:'javascript:alert(1)'}]});
 assert.match(html,/href="https:\/\/example.com\/about"/);
 assert.match(html,/About &lt;us&gt;/);
 assert.doesNotMatch(html,/evil\.example|javascript:alert/);
 assert.match(html,/aria-label="Observed navigation"/);
});

test('renders measured capture regions and a safe page inventory',()=>{
 const html=blueprintToHtml({version:1,sourceUrl:'https://example.com',title:'Site',sections:[],pages:[
  {title:'Home',regions:[{type:'hero',headline:'Observed hero',bounds:{x:0,y:0,width:800,height:280}}]},
  {title:'<img src=x>',regions:[]}
 ]});
 assert.match(html,/Observed hero/);
 assert.match(html,/min-height:280px/);
 assert.match(html,/Captured pages \(2\)/);
 assert.match(html,/&lt;img src=x&gt;/);
 assert.doesNotMatch(html,/<img/i);
});
test('invalid source URL cannot crash preview navigation rendering',()=>{
 const html=blueprintToHtml({version:1,sourceUrl:'not-a-url',title:'Site',sections:[],navigation:[{label:'Click',target:'/path'}]});
 assert.doesNotMatch(html,/href=/);
});

test('selects a distinct captured page without leaking other page content',()=>{
 const blueprint={version:1,title:'Site',sections:[],pages:[
  {title:'Home',regions:[{type:'hero',headline:'Homepage heading'}]},
  {title:'Services',regions:[{type:'section',headline:'Services-only heading'}]}
 ]};
 const html=blueprintToHtml(blueprint,1);
 assert.match(html,/Services-only heading/);
 assert.doesNotMatch(html,/Homepage heading/);
 assert.match(html,/Services \(previewed\)/);
 assert.throws(()=>blueprintToHtml(blueprint,2),/Invalid selected page/);
});

test('exports distinct standalone HTML files for multiple observed routes',()=>{
 const result=blueprintToPages({version:1,title:'Site',sections:[],pages:[
  {path:'/',title:'Home',regions:[{type:'hero',headline:'Welcome'}]},
  {path:'/about/',title:'About',regions:[{type:'section',headline:'About us'}]},
  {path:'/about/',title:'Duplicate',regions:[]}
 ]});
 assert.deepEqual(result.map(p=>p.filename),['index.html','about.html','about-3.html']);
 assert.match(result[1].html,/About us/);
 assert.equal(new Set(result.map(p=>p.filename)).size,3);
});

test('rewrites captured same-site links to generated local preview files',()=>{
 const files=blueprintToPages({version:1,title:'Site',sourceUrl:'https://example.com',sections:[],pages:[
  {path:'/',title:'Home',regions:[]},{path:'/about',title:'About',regions:[]}
 ],navigation:[{label:'About',target:'/about'},{label:'Outside',target:'https://other.example/'}]});
 assert.match(files[0].html,/href="about.html"/);
 assert.doesNotMatch(files[0].html,/href="https:\/\/other.example/);
});

test('exported previews offer hover depth without forcing motion',()=>{
 const html=blueprintToHtml({version:1,title:'Test',sections:[{type:'hero',headline:'Hero'}]});
 assert.match(html,/perspective\(1000px\)/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/transform:none!important/);
 assert.match(html,/@media\(max-width:650px\)/);
});

test('resolves relative links using the captured page path',()=>{
 const files=blueprintToPages({version:1,sourceUrl:'https://example.com',title:'Site',sections:[],pages:[
  {path:'/services/',title:'Services',regions:[]},{path:'/services/details',title:'Details',regions:[]}
 ],navigation:[{label:'Details',target:'details'}]});
 assert.match(files[0].html,/href="services-details.html"/);
});

test('uses page-specific observed navigation when exporting pages',()=>{
 const files=blueprintToPages({version:1,sourceUrl:'https://example.com',title:'Site',sections:[],pages:[
  {path:'/',title:'Home',regions:[],navigation:[{label:'About',target:'/about'}]},
  {path:'/about',title:'About',regions:[],navigation:[{label:'Home',target:'/'}]}
 ]});
 assert.match(files[0].html,/href="about.html"/);
 assert.doesNotMatch(files[0].html,/>Home<\/a>/);
 assert.match(files[1].html,/href="index.html"/);
});

test('renders validated color tokens and rejects injected CSS token values',()=>{
 const html=blueprintToHtml({version:1,title:'Site',sections:[],pages:[{path:'/',regions:[],designTokens:{backgroundColor:'#fafafa',textColor:'red;body{display:none}'}}]});
 assert.match(html,/--capture-bg:#fafafa/);
 assert.doesNotMatch(html,/display:none/);
});

test('applies observed heading and body typography without accepting CSS injection',()=>{
 const html=blueprintToHtml({version:1,title:'Site',sections:[],pages:[{path:'/',regions:[],designTokens:{fontFamily:'Arial, sans-serif',headingFontFamily:'Georgia, serif',headingFontSize:'42px',baseFontSize:'17px'}}]});
 assert.match(html,/--capture-font:Arial, sans-serif/);
 assert.match(html,/--capture-heading-font:Georgia, serif/);
 assert.match(html,/--capture-heading-size:42px/);
 assert.match(html,/--capture-base-size:17px/);
 const unsafe=blueprintToHtml({version:1,title:'Site',sections:[],pages:[{path:'/',regions:[],designTokens:{fontFamily:'Arial;body{display:none}',headingFontSize:'42px;display:none'}}]});
 assert.doesNotMatch(unsafe,/display:none/);
});
