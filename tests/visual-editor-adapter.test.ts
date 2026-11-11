import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareVisualEditorDocument,serializeVisualEditorDocument} from '../src/lib/visual-editor-adapter';

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

 test('export serializes the sanitized preview instead of returning original active markup',()=>{
 const result=serializeVisualEditorDocument({slug:'index',title:'Bakery & <Cafe>',html:'<html><head><style>body{color:red}</style></head><body><h1 onclick="alert(1)">Bakery</h1><script>alert(2)</script></body></html>'});
 assert.match(result.html,/<h1>Bakery<\/h1>/);
 assert.doesNotMatch(result.html,/<script|onclick/i);
 assert.match(result.html,/<title>Bakery &amp; &lt;Cafe&gt;<\/title>/);
 assert.match(result.html,/name="viewport"/);
 assert.match(result.html,/body\{color:red\}/);
 });
 test('export refuses blocked documents',()=>{
 assert.equal(serializeVisualEditorDocument({slug:'index',title:'Home',html:'<html><body><iframe src="https://example.com"></iframe></body></html>'}).html,'');
 });

test('editor and export block residual scripts without complete closing tags',()=>{
 for(const markup of ['<script src="https://example.com/code.js">','<script>alert(1)','<script src="https://example.com/code.js"/>']){
 const page={slug:'index',title:'Home',html:'<html><body><h1>Bakery</h1>'+markup+'</body></html>'};
 assert.equal(prepareVisualEditorDocument(page).bodyHtml,'');
 assert.equal(serializeVisualEditorDocument(page).html,'');
 }
});

test('HTML parser blocks entity-obfuscated active URLs and Grapes script configuration',()=>{
 for(const url of ['java&#115;cript:alert(1)','java&#x0a;script:alert(1)','javascript&colon;alert(1)']){
  const page={slug:'index',title:'Home',html:'<html><body><a href="'+url+'">Unsafe</a></body></html>'};
  assert.equal(serializeVisualEditorDocument(page).html,'');
 }
 const safe=serializeVisualEditorDocument({slug:'index',title:'Home',html:'<html><body data-forge-layout="image-led" data-forge-experience="standard"><h1 data-gjs-script="alert(1)">Safe</h1></body></html>'});
 assert.doesNotMatch(safe.html,/data-gjs-script/);assert.match(safe.html,/data-forge-layout="image-led"/);assert.match(safe.html,/data-forge-experience="standard"/);
});
test('escaped and comment-obfuscated CSS resource loads remain blocked',()=>{
 for(const css of ['body{background:u\\72l(https://example.com/x)}','@im/**/port "https://example.com/x";'])assert.equal(serializeVisualEditorDocument({slug:'index',title:'Home',html:'<html><head><style>'+css+'</style></head><body><h1>Page</h1></body></html>'}).html,'');
});
test('safe export retains language and escaped description metadata',()=>{
 const page={slug:'index',title:'Home',html:'<html lang="es" dir="ltr"><head><meta name="description" content="Coffee &amp; mugs &quot;daily&quot;"></head><body><h1>Hola</h1></body></html>'};
 const result=serializeVisualEditorDocument(page);assert.match(result.html,/<html lang="es" dir="ltr">/);assert.match(result.html,/name="description" content="Coffee &amp; mugs &quot;daily&quot;"/);
});
