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
