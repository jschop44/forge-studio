import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareVisualEditorDocument} from '../src/lib/visual-editor-adapter';

test('editor adapter extracts generated HTML and styles without executing scripts',()=>{
 const doc=prepareVisualEditorDocument({slug:'index',title:'Home',html:'<!doctype html><html><head><style>body{color:red}</style></head><body><main><h1>Bakery</h1><button onclick="alert(1)">Explore</button></main><script>alert(2)</script></body></html>'});
 assert.equal(doc.version,1);
 assert.equal(doc.slug,'index');
 assert.match(doc.css,/body\{color:red\}/);
 assert.match(doc.bodyHtml,/<h1>Bakery<\/h1>/);
 assert.ok(!doc.bodyHtml.includes('onclick='));
 assert.ok(!doc.bodyHtml.includes('<script'));
 assert.ok(doc.warnings.some(warning=>warning.includes('scripts')));
});

test('editor preview fails closed for embedded active content and dangerous URL schemes',()=>{
 for(const payload of ['<iframe src="https://example.com"></iframe>','<a href="javascript:alert(1)">click</a>','<svg onload="alert(1)"></svg>','<form action="https://example.com"></form>']){
  const doc=prepareVisualEditorDocument({slug:'index',title:'Home',html:'<html><head></head><body><main>'+payload+'</main></body></html>'});
  assert.equal(doc.bodyHtml,'');
  assert.equal(doc.css,'');
  assert.ok(doc.warnings.some(w=>w.includes('Preview blocked')));
 }
});

test('editor preview blocks active CSS and inline styles until a sanitizer is integrated',()=>{
 for(const html of ['<html><head><style>@import url(https://example.com/a.css)</style></head><body><p>Test</p></body></html>','<html><head></head><body><p style="background:url(https://example.com)">Test</p></body></html>','<html><head></head><body><img srcset="https://example.com/image.jpg 1x"></body></html>']){
  const doc=prepareVisualEditorDocument({slug:'index',title:'Home',html});
  assert.equal(doc.bodyHtml,'');
  assert.equal(doc.css,'');
  assert.ok(doc.warnings.some(w=>w.includes('Preview blocked')));
 }
});
