import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executeAgent} from '../src/lib/agents/execution';
import {planNextTask} from '../src/lib/agents/orchestrator';
import {AgentTaskSchema,type AgentTask} from '../src/lib/agents/types';
import {generateBusinessWebsite} from '../src/lib/business-site';

test('all six engine stages preserve business facts, quality evidence and publication approval',async()=>{
 const context={businessName:'Harbor Coffee',industry:'Coffee shop',summary:'A neighborhood roastery supplying coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs'],website:'https://example.com',approvedPlan:true,experienceStyle:'object-navigation' as const};
 const site=generateBusinessWebsite({...context,description:context.summary});
 const base={id:crypto.randomUUID(),tenantId:crypto.randomUUID(),source:'forge-studio' as const,attempt:0,createdAt:new Date().toISOString()};
 const covered=new Set<AgentTask['kind']>();let modelCalls=0;
 for(const kind of AgentTaskSchema.shape.kind.options){
  const task:AgentTask={...base,kind,payload:{...context,html:site.pages[0].html,pages:site.pages}};
  const decision=planNextTask(task);
  assert.equal(decision.status,kind==='publish-review'?'needs-approval':'ready',kind);
  const output=await executeAgent(task,async input=>{modelCalls++;assert.equal(input.businessName,context.businessName);assert.deepEqual(input.services,context.services);return {draft:{...input},provider:'cloudflare',pages:generateBusinessWebsite(input).pages}});
  assert.equal(output.stage,kind);covered.add(kind);
  if(kind==='quality-review'){assert.equal((output.data.evidence as {status:string}).status,'passed');assert.equal((output.data.audits as unknown[]).length,4)}
  if(kind==='publish-review')assert.equal(output.data.requiresApproval,true);
 }
 assert.equal(covered.size,6);assert.equal(modelCalls,1);
});
