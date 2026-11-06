import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {validateBrowserEvidence} from './browser-evidence';
const base={version:1,sourceUrl:'https://example.com',capturedAt:'2026-11-06T00:00:00Z',viewport:{width:1280,height:800},pages:[{path:'/',title:'Example',landmarks:[{role:'h1',text:'Example'}],interactions:[]}],warnings:[]};
test('accepts bounded browser evidence',()=>assert.equal(validateBrowserEvidence(base),true));
test('rejects malformed capture timestamps',()=>assert.equal(validateBrowserEvidence({...base,capturedAt:'invalid'}),false));
test('rejects oversized landmarks',()=>assert.equal(validateBrowserEvidence({...base,pages:[{...base.pages[0],landmarks:[{role:'h1',text:'x'.repeat(501)}]}]}),false));
test('rejects credentialed source URLs',()=>assert.equal(validateBrowserEvidence({...base,sourceUrl:'https://user:password@example.com'}),false));
