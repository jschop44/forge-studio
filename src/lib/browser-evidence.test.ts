import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {validateBrowserEvidence} from './browser-evidence';
test('accepts bounded browser evidence',()=>{assert.equal(validateBrowserEvidence({version:1,sourceUrl:'https://example.com',capturedAt:'2026-11-06T00:00:00Z',viewport:{width:1280,height:720},pages:[{path:'/',title:'Example',landmarks:[],interactions:[{kind:'button',label:'Open menu',verified:false}]}],warnings:[]}),true)});
test('rejects unsupported versions and excessive page counts',()=>{const base={version:2,sourceUrl:'https://example.com',capturedAt:'now',viewport:{width:1280,height:720},pages:[],warnings:[]};assert.equal(validateBrowserEvidence(base),false);assert.equal(validateBrowserEvidence({...base,version:1,pages:Array.from({length:13},()=>({path:'/',title:'x',landmarks:[],interactions:[]}))}),false)});
