import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAiError} from '../src/lib/server/ai-error.ts';
test('provider diagnosis handles native objects, strings and nested causes without Error identity',()=>{
 for(const error of [{message:'AI_ERROR: 3036: daily free allocation exhausted'},'3036: quota exceeded',{message:'AI request failed',cause:{message:'3036: allocation exhausted'}}])assert.deepEqual(summarizeAiError(error),{code:'3036',failureKind:'quota_exceeded'});
 assert.deepEqual(summarizeAiError({message:'upstream error',cause:{code:5035}}),{code:'5035',failureKind:'paid_plan_required'});
 assert.equal(summarizeAiError({message:'3040: Capacity temporarily exceeded'}).failureKind,'provider_capacity');
 assert.equal(summarizeAiError({message:'JSON Mode could not be met'}).failureKind,'schema_rejected');
});
test('provider diagnosis never returns arbitrary messages, codes, credentials or unbounded causes',()=>{
 const error={message:'PRIVATE',code:'PRIVATE',cause:null};error.cause=error;
 assert.deepEqual(summarizeAiError(error),{code:'unknown',failureKind:'unknown'});
 for(const value of [null,undefined,42,{message:'PRIVATE',cause:{token:'PRIVATE'}}])assert.ok(!JSON.stringify(summarizeAiError(value)).includes('PRIVATE'));
});
