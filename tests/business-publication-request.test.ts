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
 it('rejects oversized HTML and unknown request fields',()=>{
  assert.equal(validateBusinessPublicationRequest({...valid,pages:[{...page,html:'x'.repeat(300001)}]}).valid,false);
  assert.equal(validateBusinessPublicationRequest({...valid,admin:true}).valid,false);
 });
});
