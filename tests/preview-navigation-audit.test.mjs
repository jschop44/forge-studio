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
