import test from 'node:test';
import assert from 'node:assert/strict';
import {executeAgent} from '../src/lib/agents/execution';
import type {AgentTask} from '../src/lib/agents/types';
import {generateBusinessWebsite} from '../src/lib/business-site';
const task:AgentTask={id:crypto.randomUUID(),tenantId:crypto.randomUUID(),kind:'site-generation',source:'forge-studio',attempt:0,createdAt:new Date().toISOString(),payload:{approvedPlan:true,businessName:'Cedar Studio',industry:'Design',summary:'Independent website design services for local businesses.',services:['Website design']}};
test('approved queue generation calls the model and carries provider evidence into quality handoff',async()=>{
 let calls=0;
 const output=await executeAgent(task,async input=>{
  calls++;assert.equal(input.businessName,'Cedar Studio');assert.deepEqual(input.services,['Website design']);
  const draft={...input,description:'Model-produced copy based on the supplied business facts.'};
  return {draft,provider:'cloudflare',pages:generateBusinessWebsite(draft).pages};
 });
 assert.equal(calls,1);assert.equal(output.data.provider,'cloudflare');
 assert.equal((output.data.pages as unknown[]).length,4);
 assert.equal((output.data.draft as {description:string}).description,'Model-produced copy based on the supplied business facts.');
});
test('no model call occurs without owner plan approval',async()=>{
 let called=false;
 await assert.rejects(executeAgent({...task,payload:{...task.payload,approvedPlan:false}},async()=>{called=true;throw Error('must not call')}),/approval/);
 assert.equal(called,false);
});
test('provider failures do not fall back to deterministic draft generation',async()=>{
 await assert.rejects(executeAgent(task,async()=>{throw Error('Provider unavailable')}),/Provider unavailable/);
});
test('non-generation stages remain local and do not invoke a model',async()=>{
 const output=await executeAgent({...task,kind:'site-plan'},async()=>{throw Error('must not call')});
 assert.equal(output.stage,'site-plan');
});
