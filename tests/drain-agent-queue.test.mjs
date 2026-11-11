import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drainAgentQueue} from '../scripts/drain-agent-queue.mjs';
const env={FORGE_WORKER_URL:'https://forge-studio-preview.stands-old-3h.workers.dev/api/agents/worker',FORGE_WORKER_SECRET:'x'.repeat(64)};
const response=statuses=>Response.json({processed:statuses.length,results:statuses.map(status=>({status}))});
test('advances generated work and quality review then stops at publication approval',async()=>{
 const results=[['completed'],['completed'],['needs-approval'],[]];let calls=0;
 const result=await drainAgentQueue(env,async(url,options)=>{assert.equal(options.redirect,'error');return response(results[calls++])});
 assert.equal(calls,4);assert.equal(result.stopped,'idle-or-gated');
});
test('stops on idle and drains past blocked, approval and lost-claim results to reach unrelated jobs',async()=>{
 let idle=0;
 await drainAgentQueue(env,async()=>{idle++;return response([])});
 assert.equal(idle,1);
 for(const statuses of [['blocked'],['needs-approval'],['claim-lost'],['retry-scheduled']]){
  let calls=0;
  const outcome=await drainAgentQueue(env,async()=>{
   calls++;
   return response(calls===1?statuses:[]);
  });
  assert.equal(calls,2);
  assert.equal(outcome.stopped,'idle-or-gated');
 }
});
test('a blocked first tenant must not starve a later tenant with an eligible stage',async()=>{
 const outcomes=[['blocked'],['completed'],['needs-approval'],['completed'],[]];
 let calls=0;
 const result=await drainAgentQueue(env,async()=>response(outcomes[calls++]));
 assert.equal(calls,5);
 assert.deepEqual(result.batches.map(batch=>batch.statuses),outcomes);
 assert.equal(result.stopped,'idle-or-gated');
});
test('bounds busy queues to six batches',async()=>{let calls=0;const r=await drainAgentQueue(env,async()=>{calls++;return response(['completed'])});assert.equal(calls,6);assert.equal(r.stopped,'batch-limit')});
test('rejects untrusted endpoints and malformed or failed responses',async()=>{
 await assert.rejects(drainAgentQueue({...env,FORGE_WORKER_URL:'https://other.example'},async()=>{throw Error('must not fetch')}),/Worker URL/);
 await assert.rejects(drainAgentQueue(env,async()=>new Response('',{status:401})),/HTTP 401/);
 await assert.rejects(drainAgentQueue(env,async()=>Response.json({processed:1,results:[]})),/Invalid worker/);
});
