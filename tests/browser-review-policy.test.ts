import test from 'node:test';
import assert from 'node:assert/strict';
import {browserReviewGate} from '../src/lib/server/browser-review-policy';

test('optional browser worker outage never blocks a valid generated preview',()=>{
 assert.deepEqual(browserReviewGate('unavailable'),{block:false,reason:null});
 assert.deepEqual(browserReviewGate('not-configured'),{block:false,reason:null});
 assert.deepEqual(browserReviewGate('passed'),{block:false,reason:null});
});
test('real visual defects remain blocking even in optional mode',()=>{
 assert.deepEqual(browserReviewGate('failed'),{block:true,reason:'quality-failed'});
});
test('customer opt-in to strict independent browser review fails closed',()=>{
 for(const status of ['unavailable','not-configured'] as const){
  assert.deepEqual(browserReviewGate(status,true),{block:true,reason:'review-required'});
 }
 assert.deepEqual(browserReviewGate('passed',true),{block:false,reason:null});
 assert.deepEqual(browserReviewGate('failed',true),{block:true,reason:'quality-failed'});
});
