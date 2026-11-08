import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReferenceAppearance,websiteAddressKey} from '../src/lib/reference-appearance.ts';
const pages=['Home','Services'].map(title=>({title,html:'<!doctype html><html><head><title>'+title+'</title></head><body><h1>'+title+'</h1></body></html>'}));
test('extracted colors and fonts reach every final page without removing its content',()=>{
 const result=applyReferenceAppearance(pages,{background:'#123',accent:'#aabbcc',fontFamily:'Georgia'});
 for(const page of result){assert.ok(page.html.includes('body{background:#112233;color:#f5f5f5}'));assert.ok(page.html.includes('font-family:"Georgia"'));assert.ok(page.html.includes('background:#aabbcc'));assert.ok(page.html.includes('<h1>'+page.title+'</h1>'))}
 assert.ok(!pages[0].html.includes('forge-reference-appearance'));
});
test('raw CSS and markup cannot enter appearance styles; repeated application replaces only the owned style',()=>{
 assert.deepEqual(applyReferenceAppearance(pages,{background:'red;display:none',accent:'</style><script>bad()</script>',fontFamily:'Georgia;url(secret)'}),pages);
 const once=applyReferenceAppearance(pages,{background:'#fff'}),twice=applyReferenceAppearance(once,{background:'#000'});
 assert.equal((twice[0].html.match(/id="forge-reference-appearance"/g)||[]).length,1);assert.ok(twice[0].html.includes('background:#000000'));
});
test('equivalent homepage addresses retain extraction, while genuine URL changes invalidate it',()=>{
 assert.equal(websiteAddressKey('example.com'),websiteAddressKey(' https://EXAMPLE.com/#top '));
 assert.notEqual(websiteAddressKey('example.com/first'),websiteAddressKey('example.com/second'));
 assert.notEqual(websiteAddressKey('example.com/?page=1'),websiteAddressKey('example.com/?page=2'));
 assert.equal(websiteAddressKey('http://example.com'),null);
});
