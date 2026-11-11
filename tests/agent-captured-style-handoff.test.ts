import test from 'node:test';
import assert from 'node:assert/strict';
import {executeAgent} from '../src/lib/agents/execution';
import {nextAgentStage} from '../src/lib/agents/handoff';
import {planNextTask} from '../src/lib/agents/orchestrator';
import {generateBusinessWebsite} from '../src/lib/business-site';
import type {AgentTask} from '../src/lib/agents/types';
const capture={version:1,sourceUrl:'https://studio.example/',capturedAt:'2026-11-11T12:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{path:'/',title:'Studio',landmarks:[],interactions:[],designTokens:{backgroundColor:'#e0e9f0',textColor:'#111111',fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',headingFontSize:'48px',baseFontSize:'17px'}}]};
const task:AgentTask={id:crypto.randomUUID(),tenantId:crypto.randomUUID(),kind:'site-plan',source:'forge-studio',attempt:0,createdAt:new Date().toISOString(),payload:{businessName:'Studio',industry:'Design studio',summary:'Independent design services for local businesses and organizations.',services:['Website design'],website:capture.sourceUrl,designMode:'preserve',browserEvidence:capture}};
const model=async(input:Parameters<typeof generateBusinessWebsite>[0])=>{
 const draft=input as {businessName:string;industry:string;description:string;services:string[]};
 return {draft,provider:'cloudflare' as const,pages:generateBusinessWebsite(input).pages};
};
test('planning retains captured evidence through approved generation and quality handoff',async()=>{
 const plan=await executeAgent(task);
 const next=nextAgentStage(task,planNextTask(task),plan)!;
 assert.equal(next.payload.approvedPlan,false);
 assert.deepEqual(next.payload.browserEvidence,capture);
 let calls=0;
 const generation={...task,...next,payload:{...next.payload,approvedPlan:true}};
 const output=await executeAgent(generation,async input=>{calls++;return model(input)});
 assert.equal(calls,1);assert.equal(output.data.provider,'cloudflare');
 const pages=output.data.pages as {html:string}[];
 assert.equal(pages.length,4);
 for(const page of pages)assert.match(page.html,/--business-paper:#e0e9f0/);
 const quality=nextAgentStage(generation,planNextTask(generation),output)!;
 assert.deepEqual(quality.payload.pages,pages);
 assert.ok((output.data.designWarnings as string[]).some(w=>w.includes('remain unverified')));
});
test('redesign, scratch, unrelated sources and invalid evidence cannot apply captured styles',async()=>{
 for(const payload of [{...task.payload,designMode:'redesign'},{...task.payload,designMode:'new'},{...task.payload,website:'https://other.example/'},{...task.payload,browserEvidence:{...capture,version:2}}]){
  const output=await executeAgent({...task,kind:'site-generation',payload:{...payload,approvedPlan:true}},model);
  for(const page of output.data.pages as {html:string}[])assert.doesNotMatch(page.html,/forge-captured-appearance/);
 }
});
test('captured styles never authorize generation or replace failed model inference',async()=>{
 let calls=0;
 const generate=async()=>{calls++;throw Error('Provider unavailable')};
 await assert.rejects(executeAgent({...task,kind:'site-generation'},generate),/approval/);
 assert.equal(calls,0);
 await assert.rejects(executeAgent({...task,kind:'site-generation',payload:{...task.payload,approvedPlan:true}},generate),/Provider unavailable/);
 assert.equal(calls,1);
});

test('malformed nested capture entries fail validation without failing approved generation',async()=>{
 for(const page of [null,{...capture.pages[0],landmarks:[null]},{...capture.pages[0],interactions:[null]},{...capture.pages[0],navigationChecks:[null]}]){
  const browserEvidence={...capture,pages:[page]};
  const output=await executeAgent({...task,kind:'site-generation',payload:{...task.payload,approvedPlan:true,browserEvidence}},model);
  assert.equal(output.data.provider,'cloudflare');
  assert.deepEqual(output.data.designWarnings,['Unverified browser appearance evidence was ignored.']);
  for(const generated of output.data.pages as {html:string}[])assert.doesNotMatch(generated.html,/forge-captured-appearance/);
 }
});
