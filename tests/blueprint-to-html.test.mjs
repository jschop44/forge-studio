import test from 'node:test';
import assert from 'node:assert/strict';
import {blueprintToHtml} from '../workers/blueprint-to-html.mjs';
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
