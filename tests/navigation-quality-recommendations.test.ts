import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationQualityRecommendations} from '../src/lib/navigation-quality-recommendations';
import type {BrowserEvidence} from '../src/lib/browser-evidence';
const sample:BrowserEvidence={version:1,sourceUrl:'https://example.com',capturedAt:'2026-11-06T00:00:00Z',viewport:{width:1280,height:800},pages:[{path:'/',title:'Home',landmarks:[],interactions:[],navigationChecks:[{path:'/broken',status:404,ok:false,verifiedBy:'navigation-get'}]}],warnings:[]};
test('recommends fixing observed broken source links without asserting generated site failures',()=>{
 const report=navigationQualityRecommendations(sample);
 assert.equal(report.status,'issues-found');
 assert.equal(report.sourceOnly,true);
 assert.equal(report.recommendations.length,1);
 assert.match(report.recommendations[0].finding,/\/broken/);
});
test('does not invent recommendations for untested navigation',()=>{
 const report=navigationQualityRecommendations({...sample,pages:[{...sample.pages[0],navigationChecks:[]}]});
 assert.equal(report.status,'not-tested');
 assert.deepEqual(report.recommendations,[]);
});
