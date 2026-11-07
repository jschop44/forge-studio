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

test('counts failed read-only navigation checks without treating them as executed interactions',()=>{
 const report=assessBlueprint({version:1,pages:[{path:'/',regions:[{id:'hero'}]}],provenance:{generatedContent:false},navigationChecks:[{path:'/about',status:200,ok:true},{path:'/missing',status:404,ok:false}]});
 assert.equal(report.navigationProbes,2);
 assert.equal(report.failedNavigation,1);
 assert.equal(report.checks.readOnlyNavigation,false);
 assert.equal(report.publicationReady,false);
});

test('reports coverage of captured visual regions, navigation and design tokens',()=>{
 const report=assessBlueprint({version:1,pages:[
  {path:'/',regions:[{type:'hero'}],navigation:[{label:'About'}],designTokens:{backgroundColor:'#fff'}},
  {path:'/about',regions:[],navigation:[],designTokens:{}}
 ],interactionCoverage:{links:1},provenance:{generatedContent:false}});
 assert.equal(report.coverage.visual,0.5);
 assert.equal(report.coverage.navigation,0.5);
 assert.equal(report.coverage.designTokens,0.5);
});

test('reports actual measured geometry coverage rather than assuming every region is positioned',()=>{
 const report=assessBlueprint({version:1,pages:[{path:'/',regions:[
  {type:'hero',bounds:{x:0,y:0,width:1200,height:400}},
  {type:'section',bounds:{x:0,y:400,width:NaN,height:200}},
  {type:'footer'}
 ]}],provenance:{generatedContent:false}});
 assert.equal(report.regions,3);
 assert.equal(report.measuredRegions,1);
 assert.equal(report.unmeasuredRegions,2);
 assert.equal(report.geometryCoverage,1/3);
 assert.equal(report.checks.measuredGeometry,false);
 assert.ok(report.warnings.some(w=>w.includes('measured geometry')));
});
test('full measured geometry is explicitly reported without publication claims',()=>{
 const report=assessBlueprint({version:1,pages:[{regions:[{bounds:{x:0,y:0,width:100,height:100}}]}]});
 assert.equal(report.geometryCoverage,1);
 assert.equal(report.checks.measuredGeometry,true);
 assert.equal(report.publicationReady,false);
});

test('malformed pages and interaction counts cannot crash or inflate quality metrics',()=>{
 const report=assessBlueprint({version:1,pages:[null,{path:'/valid',regions:[{bounds:{x:0,y:0,width:10,height:10}}]}],interactionCoverage:{links:-5,buttons:'100',forms:Infinity}});
 assert.equal(report.pages,2);
 assert.equal(report.regions,1);
 assert.equal(report.observed.links,0);
 assert.equal(report.observed.buttons,0);
 assert.equal(report.observed.forms,0);
 assert.equal(report.emptyPages,1);
 assert.equal(report.geometryCoverage,1);
 assert.equal(report.publicationReady,false);
});

test('measured-page coverage distinguishes pages with and without valid geometry',()=>{
 const report=assessBlueprint({version:1,pages:[
  {path:'/',regions:[{bounds:{x:0,y:0,width:200,height:100}}]},
  {path:'/about',regions:[{bounds:{x:0,y:0,width:0,height:100}}]},
  {path:'/contact',regions:[]}
 ]});
 assert.equal(report.coverage.visual,2/3);
 assert.equal(report.coverage.measuredPages,1/3);
 assert.equal(report.geometryCoverage,0.5);
 assert.equal(report.checks.measuredGeometry,false);
});
