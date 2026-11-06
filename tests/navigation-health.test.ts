import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeNavigationHealth} from '../src/lib/navigation-health';
import type {BrowserEvidence} from '../src/lib/browser-evidence';
const base:BrowserEvidence={version:1,sourceUrl:'https://example.com',capturedAt:'2026-11-06T12:00:00Z',viewport:{width:1280,height:800},pages:[{path:'/',title:'Home',landmarks:[],interactions:[],navigationChecks:[{path:'/about',status:200,ok:true,verifiedBy:'navigation-get'},{path:'/missing',status:404,ok:false,verifiedBy:'navigation-get'},{path:'/timeout',status:null,ok:false,verifiedBy:'navigation-get'}]}],warnings:[]};
test('reports broken and inconclusive navigation separately',()=>{
 const result=summarizeNavigationHealth(base);
 assert.equal(result.inspected,3);
 assert.equal(result.passed,1);
 assert.equal(result.broken,1);
 assert.equal(result.inconclusive,1);
 assert.deepEqual(result.brokenPaths,['/missing']);
 assert.equal(result.status,'issues-found');
});
test('does not claim navigation passed without checks',()=>{
 const result=summarizeNavigationHealth({...base,pages:[{...base.pages[0],navigationChecks:[]}]});
 assert.equal(result.status,'not-tested');
});
