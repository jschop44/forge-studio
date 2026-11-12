import {test} from 'node:test';
import assert from 'node:assert/strict';
import {waitForDeployedRevision} from '../scripts/wait-deployed-revision.mjs';
const expected='a'.repeat(40),old='b'.repeat(40);
test('edge verification waits through an old healthy revision and requires the exact release',async()=>{
 let calls=0;const delays=[];
 const result=await waitForDeployedRevision(expected,{fetcher:async(_url,options)=>{assert.equal(options.cache,'no-store');return Response.json({ok:true,service:'forge-studio',revision:++calls===1?old:expected})},pause:async ms=>{delays.push(ms)}});
 assert.equal(result,expected);assert.equal(calls,2);assert.deepEqual(delays,[3000]);
});
test('persistent revision mismatch fails within its fixed budget',async()=>{
 let calls=0;await assert.rejects(waitForDeployedRevision(expected,{attempts:3,fetcher:async()=>{calls++;return Response.json({ok:true,service:'forge-studio',revision:old})},pause:async()=>{}}),/bounded propagation window/);assert.equal(calls,3);
});
test('invalid expected revisions fail before any network request',async()=>{
 await assert.rejects(waitForDeployedRevision('unknown',{fetcher:async()=>{throw Error('must not request')}}),/full verified commit/);
});
