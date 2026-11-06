import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeInteractionEvidence,InteractionEvidenceSchema} from '../src/lib/interaction-evidence';

test('counts observed interactions without claiming executed verification',()=>{
 const summary=summarizeInteractionEvidence([{kind:'link',label:'Services',target:'/services',verified:false},{kind:'button',label:'',verified:false},{kind:'form',label:'Contact',verified:false}]);
 assert.equal(summary.observed,3);
 assert.equal(summary.forms,1);
 assert.equal(summary.unlabeledControls,1);
 assert.equal(summary.interactionsExecuted,false);
 assert.equal(summary.requiresFunctionalVerification,true);
});
test('rejects invented verified interaction evidence and unbounded payloads',()=>{
 assert.equal(InteractionEvidenceSchema.safeParse([{kind:'button',label:'Pay',verified:true}]).success,false);
 assert.equal(InteractionEvidenceSchema.safeParse(Array.from({length:81},()=>({kind:'link',label:'Next',verified:false}))).success,false);
});
