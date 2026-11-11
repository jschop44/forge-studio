import test from 'node:test';
import assert from 'node:assert/strict';
import {executeAgent,executeSafeAgent} from '../src/lib/agents/execution';
import {nextAgentStage} from '../src/lib/agents/handoff';
import {planNextTask} from '../src/lib/agents/orchestrator';
import {generateBusinessWebsite} from '../src/lib/business-site';
import type {AgentTask} from '../src/lib/agents/types';
const task:AgentTask={id:crypto.randomUUID(),tenantId:crypto.randomUUID(),kind:'site-plan',source:'forge-studio',attempt:0,createdAt:new Date().toISOString(),payload:{businessName:'Acceptance Studio',industry:'Design studio',summary:'A design studio providing accessible websites for local businesses.',services:['Website design'],contactEmail:'hello@example.com'}};
test('approved planning handoff retains supplied contact email through inference and rendered pages',async()=>{
 const plan=await executeAgent(task);
 const next=nextAgentStage(task,planNextTask(task),plan)!;
 assert.equal(next.payload.approvedPlan,false);
 assert.equal(next.payload.contactEmail,'hello@example.com');
 const generation={...task,...next,payload:{...next.payload,approvedPlan:true}};
 const result=await executeAgent(generation,async input=>{
  assert.equal(input.contactEmail,'hello@example.com');
  return {draft:input,provider:'cloudflare',pages:generateBusinessWebsite(input).pages};
 });
 assert.equal(result.data.provider,'cloudflare');
 const pages=result.data.pages as {slug:string;html:string}[];
 assert.ok(pages.find(page=>page.slug==='contact')?.html.includes('mailto:hello@example.com'));
 assert.equal(executeSafeAgent(generation).stage,'site-generation');
});
test('missing contacts remain absent rather than being invented',async()=>{
 const payload:Record<string,unknown>={...task.payload,approvedPlan:true};delete payload.contactEmail;
 await executeAgent({...task,kind:'site-generation',payload},async input=>{
  assert.equal(input.contactEmail,undefined);
  return {draft:input,provider:'cloudflare',pages:generateBusinessWebsite(input).pages};
 });
});
test('invalid contacts fail before inference and approval remains mandatory',async()=>{
 let called=false;
 const generate=async()=>{called=true;throw Error('must not infer')};
 await assert.rejects(executeAgent({...task,kind:'site-generation',payload:{...task.payload,approvedPlan:true,contactEmail:'javascript:alert(1)'}},generate));
 await assert.rejects(executeAgent({...task,kind:'site-generation'},generate),/approval/);
 assert.equal(called,false);
});
