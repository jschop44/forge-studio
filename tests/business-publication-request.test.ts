import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {validateBusinessPublicationRequest} from '../src/lib/business-publication-request';

const page={slug:'index',title:'Home',html:'<!doctype html><html><head><title>Home</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>Hello</h1></body></html>'};
const valid={ownerApproved:true,businessName:'Northstar Coffee',pages:[page]};

describe('business publication request validation',()=>{
 it('accepts a structurally valid, explicitly approved draft',()=>{
  assert.equal(validateBusinessPublicationRequest(valid).valid,true);
 });
 it('rejects missing owner approval',()=>{
  assert.equal(validateBusinessPublicationRequest({...valid,ownerApproved:false}).valid,false);
 });
 it('rejects duplicate slugs and broken internal links',()=>{
  assert.equal(validateBusinessPublicationRequest({...valid,pages:[page,{...page,html:page.html.replace('</body>','<a href="missing.html">Missing</a></body>')}] }).valid,false);
 });
 it('rejects active HTML, event handlers and redirects',()=>{
  for(const injection of ['<script>alert(1)</script>','<iframe src="https://example.com"></iframe>','<form action="/x"></form>','<meta http-equiv="refresh" content="0;url=https://example.com">','<img src="x" onerror="alert(1)">']){
   const html=page.html.replace('</body>',injection+'</body>');
   assert.equal(validateBusinessPublicationRequest({...valid,pages:[{...page,html}]}).valid,false,injection);
  }
 });
 it('rejects oversized HTML and unknown request fields',()=>{
  assert.equal(validateBusinessPublicationRequest({...valid,pages:[{...page,html:'x'.repeat(300001)}]}).valid,false);
  assert.equal(validateBusinessPublicationRequest({...valid,admin:true}).valid,false);
 });
});
