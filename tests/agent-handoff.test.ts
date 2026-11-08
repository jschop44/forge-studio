import test from 'node:test';
import assert from 'node:assert/strict';
import {nextAgentStage} from '../src/lib/agents/handoff';
import type {AgentTask,AgentDecision} from '../src/lib/agents/types';
const task={id:crypto.randomUUID(),tenantId:crypto.randomUUID(),kind:'site-plan',source:'forge-studio',payload:{businessName:'Studio',approvedPlan:true},attempt:0,createdAt:new Date().toISOString()} as AgentTask;
const decision={taskId:task.id,status:'ready',reason:'Next',next:'site-generation'} as AgentDecision;
test('planning handoff preserves facts and requires approval for generation',()=>{
 const next=nextAgentStage(task,decision,{stage:'site-plan',summary:'Plan',data:{pages:['Home']}});
 assert.equal(next?.payload.businessName,'Studio');assert.equal(next?.payload.approvedPlan,false);
 assert.equal(task.payload.approvedPlan,true);
});
test('quality handoff includes every generated page',()=>{
 const pages=[{slug:'index',html:'one'},{slug:'contact',html:'two'}];
 const next=nextAgentStage(task,{...decision,next:'quality-review'},{stage:'site-generation',summary:'Draft',data:{pages}});
 assert.deepEqual(next?.payload.pages,pages);
});
test('approval, blocked and terminal tasks do not create successors',()=>{
 const output={stage:'site-plan',summary:'Plan',data:{}} as const;
 for(const status of ['needs-approval','blocked'] as const)assert.equal(nextAgentStage(task,{...decision,status},output),undefined);
 assert.equal(nextAgentStage(task,{...decision,next:undefined},output),undefined);
 assert.equal(nextAgentStage(task,decision,null),undefined);
});
