import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {previewDestination,businessPreviewHtml} from '../src/lib/business-preview';
const slugs=['index','services','about','contact','events'];
test('preview routes filename, path and fragment links to emitted business pages',()=>{
 for(const href of ['about.html','./about.html','/about.html','/about','about/','/site/about.html?view=1'])assert.deepEqual(previewDestination(href,slugs,'index'),{slug:'about',hash:''});
 assert.deepEqual(previewDestination('services.html#offering-2',slugs,'index'),{slug:'services',hash:'#offering-2'});
 assert.deepEqual(previewDestination('#team',slugs,'about'),{slug:'about',hash:'#team'});
 assert.deepEqual(previewDestination('/',slugs,'about'),{slug:'index',hash:''});
 for(const href of ['/business','missing.html','javascript:alert(1)','mailto:hello@example.com','https://other.example/about.html','//other.example/about'])assert.equal(previewDestination(href,slugs,'index'),null,href);
});
test('preview bridge is valid JavaScript and installed before business controllers',()=>{
 const page={slug:'index',title:'Home',html:'<!doctype html><html><head><title>Business</title></head><body><script id="controller">/* controller */</script></body></html>'};
 const html=businessPreviewHtml(page,[page,{...page,slug:'about',title:'About'}]);
 const script=html.match(/<script id="forge-preview-navigation">([\s\S]*?)<\/script>/)![1];
 assert.doesNotThrow(()=>new Script(script));assert.ok(!script.includes('__name('));assert.ok(html.indexOf('forge-preview-navigation')<html.indexOf('id="controller"'));
 assert.equal(businessPreviewHtml(undefined,[]),'');
 assert.match(script,/forge-preview-height/);
 assert.match(script,/ResizeObserver/);
 assert.match(script,/data-forge-experience/);
 assert.match(script,/getAttribute\('data-forge-experience'\)!=='standard'/);
 assert.match(script,/parent\.postMessage/);
});
