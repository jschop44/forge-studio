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
 assert.deepEqual(result.map(p=>p.filename),['index.html','about.html','about-2.html']);
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
 assert.doesNotMatch(files[0].html,/<nav[^>]*>[\s\S]*?>Home<\/a>[\s\S]*?<\/nav>/);
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

test('each exported page has its own escaped heading',()=>{
 const files=blueprintToPages({version:1,title:'Brand',headline:'Home headline',sections:[],pages:[{path:'/',title:'Home',regions:[]},{path:'/contact',title:'Contact <team>',regions:[]}]});
 assert.match(files[0].html,/<h1>Home<\/h1>/);
 assert.match(files[1].html,/<h1>Contact &lt;team&gt;<\/h1>/);
 assert.doesNotMatch(files[1].html,/<h1>Home headline<\/h1>/);
});

test('exports distinct page titles in HTML metadata',()=>{
 const files=blueprintToPages({version:1,title:'Brand',sections:[],pages:[{path:'/',title:'Home',regions:[]},{path:'/pricing',title:'Pricing & Plans',regions:[]}]});
 assert.match(files[0].html,/<title>Home<\/title>/);
 assert.match(files[1].html,/<title>Pricing &amp; Plans<\/title>/);
});

test('local preview navigation distinguishes routes with different query strings',()=>{
 const pages=blueprintToPages({version:1,sourceUrl:'https://example.com',title:'Site',sections:[],pages:[
  {path:'/catalog?type=a',title:'Type A',regions:[],navigation:[{label:'Type B',target:'/catalog?type=b'}]},
  {path:'/catalog?type=b',title:'Type B',regions:[]}
 ]});
 assert.notEqual(pages[0].filename,pages[1].filename);
 assert.match(pages[0].html,new RegExp('href="'+pages[1].filename.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"'));
});
test('rejects noninteger and out-of-bounds selected pages',()=>{
 const bp={version:1,sections:[],pages:[{title:'Home',regions:[]}]};
 for(const index of [-1,1,1.5,NaN])assert.throws(()=>blueprintToHtml(bp,index),/Invalid selected page/);
});

test('query routes produce stable and distinct safe preview filenames',()=>{
 const blueprint={version:1,sourceUrl:'https://example.com',sections:[],pages:[
  {path:'/catalog?type=a',title:'A',regions:[]},
  {path:'/catalog?type=b',title:'B',regions:[]},
  {path:'/catalog?type=a',title:'Duplicate A',regions:[]}
 ]};
 const filenames=blueprintToPages(blueprint).map(p=>p.filename);
 assert.equal(new Set(filenames).size,3);
 assert.ok(filenames.every(name=>/^[a-zA-Z0-9_-]+\.html$/.test(name)));
 assert.deepEqual(blueprintToPages(blueprint).map(p=>p.filename),filenames);
});

test('secondary pages without observed links inherit safe global navigation',()=>{
 const pages=blueprintToPages({version:1,sourceUrl:'https://example.com',title:'Site',sections:[],
  navigation:[{label:'Home',target:'/'},{label:'Contact',target:'/contact'}],
  pages:[{path:'/',title:'Home',regions:[],navigation:[]},{path:'/contact',title:'Contact',regions:[],navigation:[]}]});
 assert.match(pages[1].html,/href="index\.html"/);
 assert.match(pages[1].html,/href="contact\.html"/);
});

test('filename collisions with existing numeric slugs still preserve all navigation targets',()=>{
 const pages=blueprintToPages({version:1,sourceUrl:'https://example.com',sections:[],pages:[
  {path:'/a',title:'A',regions:[],navigation:[{label:'Second',target:'/a-2'}]},
  {path:'/a-2',title:'A-2',regions:[]},
  {path:'/a',title:'Duplicate A',regions:[]}
 ]});
 assert.deepEqual(pages.map(p=>p.filename),['a.html','a-2.html','a-3.html']);
 assert.match(pages[0].html,/href="a-2\.html"/);
});

test('offline captured-page directory links to every generated HTML page',()=>{
 const files=blueprintToPages({version:1,sourceUrl:'https://example.com',sections:[],pages:[
  {path:'/',title:'Home',regions:[]},
  {path:'/about',title:'About',regions:[]},
  {path:'/contact',title:'Contact',regions:[]}
 ]});
 for(const file of files){
  for(const destination of files)assert.ok(file.html.includes('href="'+destination.filename+'"'),destination.filename);
 }
});

test('offline page directory marks exactly the current page for assistive technology',()=>{
 const files=blueprintToPages({version:1,sourceUrl:'https://example.com',sections:[],pages:[
  {path:'/',title:'Home',regions:[]},{path:'/about',title:'About',regions:[]}
 ]});
 assert.match(files[0].html,/href="index\.html" aria-current="page"/);
 assert.match(files[1].html,/href="about\.html" aria-current="page"/);
 for(const file of files)assert.equal((file.html.match(/aria-current="page"/g)||[]).length,1);
});

test('untrusted preview source with nonstandard port cannot create outbound links',()=>{
 const html=blueprintToHtml({version:1,sourceUrl:'https://example.com:8443',sections:[],navigation:[{label:'Admin',target:'/admin'}],pages:[{path:'/',title:'Home',regions:[]}]});
 assert.doesNotMatch(html,/href="https:\/\/example\.com:8443\/admin"/);
});

test('reconstruction preserves measured region width and horizontal offset',()=>{
 const html=blueprintToHtml({version:1,title:'Columns',sections:[
  {type:'content',headline:'Left',bounds:{x:0,y:100,width:400,height:220}},
  {type:'content',headline:'Right',bounds:{x:400,y:100,width:400,height:220}}
 ]});
 assert.match(html,/left:0%;width:50%/);
 assert.match(html,/left:50%;width:50%/);
 assert.match(html,/min-height:220px/);
 assert.match(html,/position:relative!important;top:auto!important/);
});
test('invalid measured dimensions never inject CSS',()=>{
 const html=blueprintToHtml({version:1,title:'Invalid',sections:[
  {type:'content',headline:'Invalid',bounds:{x:-10,y:0,width:100,height:100}}
 ]});
 assert.doesNotMatch(html,/margin-left:-/);
 assert.match(html,/Invalid/);
});

test('measured desktop regions preserve vertical separation and shared rows',()=>{
 const html=blueprintToHtml({version:1,title:'Layout',sections:[
  {type:'hero',headline:'Hero',bounds:{x:0,y:120,width:900,height:280}},
  {type:'content',headline:'Left',bounds:{x:0,y:450,width:450,height:200}},
  {type:'content',headline:'Right',bounds:{x:450,y:450,width:450,height:200}}
 ]});
 assert.match(html,/class="capture-layout" style="min-height:530px"/);
 assert.match(html,/top:0px;left:0%;width:100%/);
 assert.match(html,/top:330px;left:0%;width:50%/);
 assert.match(html,/top:330px;left:50%;width:50%/);
});
