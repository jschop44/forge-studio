import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPreviewManifest} from '../workers/preview-manifest.mjs';
import {blueprintToPages} from '../workers/blueprint-to-html.mjs';
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

test('manifest hashes match exact UTF-8 exported HTML bytes',()=>{
 const blueprint={version:1,sections:[],pages:[{path:'/',title:'Résumé & Café',regions:[]}]};
 const manifest=buildPreviewManifest(blueprint);
 const html=blueprintToPages(blueprint)[0].html;
 assert.equal(manifest.pages[0].sha256,createHash('sha256').update(html,'utf8').digest('hex'));
 assert.match(manifest.pages[0].sha256,/^[a-f0-9]{64}$/);
});
