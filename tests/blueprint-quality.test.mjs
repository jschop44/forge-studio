import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBlueprint} from '../workers/blueprint-quality.mjs';
test('reports coverage without claiming publication readiness',()=>{
 const report=assessBlueprint({version:1,pages:[{regions:[{id:'one'}]}],interactionCoverage:{links:2,buttons:1,forms:1},provenance:{generatedContent:false}});
 assert.equal(report.pages,1);
 assert.equal(report.regions,1);
 assert.equal(report.publicationReady,false);
 assert.equal(report.requiresHumanReview,true);
 assert.ok(report.warnings.some(w=>w.includes('not functionally verified')));
});
test('reports missing source and rejects malformed blueprints',()=>{
 assert.throws(()=>assessBlueprint({version:1}));
 const report=assessBlueprint({version:1,pages:[]});
 assert.equal(report.checks.sourceProvenance,false);
 assert.ok(report.warnings.length>=2);
});

test('flags duplicate captured routes and pages with missing visual coverage',()=>{
 const report=assessBlueprint({version:1,pages:[{path:'/',regions:[{id:'a'}]},{path:'/',regions:[]}],provenance:{generatedContent:false}});
 assert.equal(report.duplicatePaths,1);
 assert.equal(report.emptyPages,1);
 assert.equal(report.checks.uniquePagePaths,false);
 assert.equal(report.checks.allPagesHaveRegions,false);
 assert.equal(report.publicationReady,false);
});
