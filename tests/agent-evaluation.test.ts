import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAgentTask} from '../src/lib/agents/evaluate';
import {reviewAgentPages} from '../src/lib/agents/quality';
import {executeSafeAgent} from '../src/lib/agents/execution';
import type {AgentTask} from '../src/lib/agents/types';
const base={id:'3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7c',tenantId:'f6a38971-ec2d-4809-9251-c70e44164f3e',source:'forge-studio' as const,attempt:0,createdAt:'2026-11-05T00:00:00.000Z'};
test('quality evidence is computed once per evaluation and never shared with edited pages',async()=>{
 const pages=executeSafeAgent({...base,kind:'site-generation',payload:{approvedPlan:true,businessName:'Studio',industry:'Design',summary:'Design services for local businesses.',services:['Planning']}}).data.pages;
 let calls=0;const review=(payload:Record<string,unknown>)=>{calls++;return reviewAgentPages(payload)};
 const task:AgentTask={...base,kind:'quality-review',payload:{pages}};
 const good=await evaluateAgentTask(task,review);
 assert.equal(calls,1);assert.equal(good.decision.next,'publish-review');
 assert.equal((good.output?.data.evidence as {status:string}).status,'passed');
 const bad=await evaluateAgentTask({...task,payload:{pages:[{slug:'index',title:'Broken',html:'<p>Broken</p>'}]}},review);
 assert.equal(calls,2);assert.equal(bad.decision.status,'blocked');assert.equal(bad.output,null);
});
test('all six stages preserve approvals and deterministic execution',async()=>{
 for(const kind of ['lead-enrichment','website-audit','site-plan','site-generation','quality-review','publish-review'] as const){
  const result=await evaluateAgentTask({...base,kind,payload:{businessName:'Studio',website:'https://example.org'}});
  assert.equal(result.decision.status,kind==='website-audit'||kind==='quality-review'?'blocked':kind==='site-generation'||kind==='publish-review'?'needs-approval':'ready');
 }
});
