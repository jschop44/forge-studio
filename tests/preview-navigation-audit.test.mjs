import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPreviewNavigation} from '../workers/preview-navigation-audit.mjs';
test('audits generated local links without network access',()=>{
 const report=auditPreviewNavigation({version:1,sourceUrl:'https://example.com',title:'Site',sections:[],pages:[
  {path:'/',title:'Home',regions:[],navigation:[{label:'About',target:'/about'},{label:'External',target:'/not-captured'}]},
  {path:'/about',title:'About',regions:[],navigation:[{label:'Home',target:'/'}]}
 ]});
 assert.equal(report.pages,2);
 assert.equal(report.localLinks,2);
 assert.equal(report.externalLinks,1);
 assert.equal(report.allLinksValid,true);
 assert.equal(report.publicationReady,false);
});
test('invalid blueprint fails navigation audit',()=>{
 assert.throws(()=>auditPreviewNavigation({version:2,sections:[]}),/Invalid blueprint/);
});

test('all exported pages are reachable from offline entrypoint',()=>{
 const report=auditPreviewNavigation({version:1,sourceUrl:'https://example.com',sections:[],pages:[
  {path:'/',title:'Home',regions:[]},
  {path:'/products',title:'Products',regions:[]},
  {path:'/contact',title:'Contact',regions:[]}
 ]});
 assert.equal(report.allPagesReachable,true);
 assert.deepEqual(report.unreachablePages,[]);
 assert.ok(report.localLinks>=6);
});

test('external preview links must have safe HTTPS origins',()=>{
 const report=auditPreviewNavigation({version:1,sourceUrl:'https://example.com',sections:[],navigation:[
  {label:'Safe',target:'https://example.com/ok?x=1&y=2'},
  {label:'Unsafe credentials',target:'https://user@example.com/private'},
  {label:'Unsafe port',target:'https://example.com:8443/admin'}
 ],pages:[{path:'/',title:'Home',regions:[]}]});
 assert.equal(report.allLinksValid,true);
 assert.equal(report.externalLinks,1);
 assert.equal(report.broken.length,0);
});
