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
