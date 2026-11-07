import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPreviewManifest} from '../workers/preview-manifest.mjs';
test('exports deterministic bounded offline preview manifest',()=>{
 const blueprint={version:1,sourceUrl:'https://example.com',title:'Example',sections:[],pages:[{path:'/',title:'Home',regions:[]},{path:'/about',title:'About',regions:[]}]};
 const manifest=buildPreviewManifest(blueprint);
 assert.equal(manifest.kind,'offline-reconstruction-preview');
 assert.equal(manifest.entrypoint,'index.html');
 assert.deepEqual(manifest.pages.map(p=>p.filename),['index.html','about.html']);
 assert.deepEqual(manifest.pages.map(p=>p.sourcePath),['/','/about']);
 assert.ok(manifest.pages.every(p=>p.bytes>100));
 assert.equal(manifest.publicationReady,false);
 assert.equal(manifest.generatedAt,null);
 assert.deepEqual(buildPreviewManifest(blueprint),manifest);
});
test('manifest rejects invalid blueprint',()=>{
 assert.throws(()=>buildPreviewManifest({version:2,sections:[]}),/Invalid blueprint/);
});
