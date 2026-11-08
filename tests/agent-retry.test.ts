import test from 'node:test';
import assert from 'node:assert/strict';
import {agentRetryDelay} from '../src/lib/agents/retry';
test('transient AI failures receive bounded exponential retries',()=>{
 assert.equal(agentRetryDelay(new Error('WORKERS_AI_PROVIDER_FAILURE'),0,3),60);
 assert.equal(agentRetryDelay(new Error('WORKERS_AI_PROVIDER_FAILURE'),2,3),240);
 assert.equal(agentRetryDelay(new Error('Local AI capacity exceeded'),1,3),120);
 assert.equal(agentRetryDelay(new Error('Local AI unavailable: network timeout'),0,3),60);
 assert.equal(agentRetryDelay(new Error('WORKERS_AI_PROVIDER_FAILURE'),10,20),3600);
});
test('exhausted, invalid and policy failures never retry',()=>{
 for(const error of [new Error('Site plan approval required'),new Error('WORKERS_AI_INVALID_RESPONSE'),new Error('Invalid task'),null])assert.equal(agentRetryDelay(error,0,3),null);
 assert.equal(agentRetryDelay(new Error('WORKERS_AI_PROVIDER_FAILURE'),3,3),null);
 assert.equal(agentRetryDelay(new Error('WORKERS_AI_PROVIDER_FAILURE'),-1,3),null);
});
