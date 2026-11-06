import {describe,it,expect} from 'vitest';
import {validateBusinessPublicationRequest} from '../src/lib/business-publication-request';

const page={slug:'index',title:'Home',html:'<!doctype html><html><head><title>Home</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>Hello</h1></body></html>'};
const valid={ownerApproved:true,businessName:'Northstar Coffee',pages:[page]};

describe('business publication request validation',()=>{
 it('accepts a structurally valid, explicitly approved draft',()=>{
  expect(validateBusinessPublicationRequest(valid).valid).toBe(true);
 });
 it('rejects missing owner approval',()=>{
  expect(validateBusinessPublicationRequest({...valid,ownerApproved:false}).valid).toBe(false);
 });
 it('rejects duplicate slugs and broken internal links',()=>{
  expect(validateBusinessPublicationRequest({...valid,pages:[page,{...page,html:page.html.replace('</body>','<a href="missing.html">Missing</a></body>')}] }).valid).toBe(false);
 });
 it('rejects oversized HTML and unknown request fields',()=>{
  expect(validateBusinessPublicationRequest({...valid,pages:[{...page,html:'x'.repeat(300001)}]}).valid).toBe(false);
  expect(validateBusinessPublicationRequest({...valid,admin:true}).valid).toBe(false);
 });
});
