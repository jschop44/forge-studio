import test from 'node:test';
import assert from 'node:assert/strict';
import {createSitePlan} from '../src/lib/agents/site-plan';

test('planning preserves supplied business facts and creates four concrete page plans',()=>{
 const input={businessName:'Cedar Studio',industry:'Design',summary:'We design websites for local businesses.',services:[' Design ','Consulting','Design']};
 const plan=createSitePlan(input);
 assert.deepEqual(plan.businessBrief,{businessName:'Cedar Studio',industry:'Design',description:input.summary,services:['Design','Consulting']});
 assert.deepEqual(plan.missingInformation,[]);
 assert.deepEqual(plan.pagePlans.map(page=>page.slug),['index','services','about','contact']);
 assert.deepEqual(plan.pagePlans[1].suppliedFacts,['Design','Consulting']);
 plan.businessBrief.services.push('Changed');
 assert.equal(input.services.length,3);
});
test('missing facts remain explicit instead of being presented as researched business details',()=>{
 const plan=createSitePlan({});
 assert.equal(plan.businessBrief.businessName,null);
 assert.deepEqual(plan.businessBrief.services,[]);
 assert.deepEqual(plan.missingInformation,['businessName','industry','description','services']);
 assert.equal(plan.externalResearchPerformed,false);
 assert.equal(plan.generationMode,'ai-assisted-draft');
 assert.equal(plan.requiresApproval,true);
 assert.deepEqual(plan.pagePlans[3].needsVerification,['contact details']);
});

test('planning turns supplied markup findings into evidence-labelled prioritized improvements',()=>{
 const plan=createSitePlan({html:'<!doctype html><html><head></head><body><p>Design services</p></body></html>'});
 assert.equal(plan.optimizationPlan.markupReviewed,true);
 assert.ok(plan.optimizationPlan.improvements.length>0);
 assert.equal(plan.optimizationPlan.improvements[0].severity,'high');
 assert.ok(plan.optimizationPlan.improvements.every(item=>item.evidence==='supplied-markup'&&item.requiresVerification));
 assert.equal(plan.optimizationPlan.marketResearchPerformed,false);
 assert.equal(plan.optimizationPlan.competitorClaimsVerified,false);
});

test('planning without markup invents no audit findings or competitor evidence',()=>{
 const plan=createSitePlan({businessName:'Cedar Studio'});
 assert.equal(plan.optimizationPlan.markupReviewed,false);
 assert.deepEqual(plan.optimizationPlan.improvements,[]);
 assert.ok(plan.optimizationPlan.verificationRequired.includes('real performance'));
});
