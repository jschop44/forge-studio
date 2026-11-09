import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {evaluateAgentTask} from '../src/lib/agents/evaluate';
import {prepareAgentAudit} from '../src/lib/server/agent-audit-source';
import {executeAgent} from '../src/lib/agents/execution';
import {nextAgentStage} from '../src/lib/agents/handoff';
import {settleAgentJob} from '../src/lib/server/agent-job-settlement';
import {generateBusinessWebsite} from '../src/lib/business-site';
import type {AgentTask} from '../src/lib/agents/types';

test('URL-only imported lead survives durable stage handoffs and restart while both approvals remain mandatory',async()=>{
 const path=await mkdtemp(join(tmpdir(),'forge-pipeline-'));let db=new PGlite(path);
 const tenant=crypto.randomUUID(),parent=crypto.randomUUID();
 const html='<!doctype html><html lang="en"><head><title>Repair Studio</title></head><body><h1>Watch repairs</h1></body></html>';
 const query=async(text:string,values:unknown[])=>(await db.query<Record<string,unknown>>(text,values)).rows;
 const observed:string[]=[];
 const step=async()=>{
  const rows=await query("UPDATE forge_jobs SET status='evaluating',updated_at=now() WHERE id=(SELECT id FROM forge_jobs WHERE status='pending' ORDER BY created_at LIMIT 1) RETURNING *,updated_at::text AS lease",[]);
  assert.equal(rows.length,1);const row=rows[0];
  const task={id:String(row.id),tenantId:tenant,kind:row.kind,source:'leadflow',payload:row.payload,attempt:0,createdAt:new Date(String(row.created_at)).toISOString()} as AgentTask;
  const result=await evaluateAgentTask(task,undefined,async(t,_,review)=>executeAgent(t,async()=>{
   // Synthetic generation fixture; real Cloudflare inference is verified separately at deployment.
   const draft={businessName:'Repair Studio',industry:'Horology',description:'Watch repair services and careful restoration for customers.',services:['Watch repair'],design:{layout:'editorial' as const,palette:'sand' as const}};
   return {draft,provider:'cloudflare',pages:generateBusinessWebsite(draft).pages};
  },review),input=>prepareAgentAudit(input,async website=>({website,html,observedAt:'2026-11-09T00:00:00Z'})));
  const status=result.decision.status==='ready'?'completed':result.decision.status==='needs-approval'?'needs-approval':'blocked';
  observed.push(task.kind+':'+status);
  const next=nextAgentStage(result.task,result.decision,result.output);
  assert.equal(await settleAgentJob(query,{id:task.id,tenantId:tenant,attempt:0,lease:String(row.lease)},{status,result:result.output,reason:result.decision.reason,next}),true);
  return {task,status};
 };
 try{
  await db.exec(`CREATE TABLE forge_jobs(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,parent_id uuid REFERENCES forge_jobs(id),kind text NOT NULL,source text NOT NULL,payload jsonb NOT NULL,status text NOT NULL DEFAULT 'pending',result jsonb,last_error text,attempt int NOT NULL DEFAULT 0,max_attempts int NOT NULL DEFAULT 3,available_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE UNIQUE INDEX parent_kind ON forge_jobs(parent_id,kind) WHERE parent_id IS NOT NULL;`);
  await query("INSERT INTO forge_jobs(id,tenant_id,kind,source,payload) VALUES($1,$2,'lead-enrichment','leadflow',$3::jsonb)",[parent,tenant,JSON.stringify({businessName:'Repair Studio',industry:'Horology',summary:'Watch repair and restoration for customers.',services:['Watch repair'],website:'https://example.org'})]);
  await step();await step();await step();const gated=await step();
  assert.equal(gated.status,'needs-approval');assert.equal(gated.task.kind,'site-generation');
  assert.equal((await query("SELECT id FROM forge_jobs WHERE status='pending'",[])).length,0);
  // Reopen disk-backed Postgres to verify that evidence and the approval gate survive restart.
  await db.close();db=new PGlite(path);
  const restored=(await query("SELECT payload,status FROM forge_jobs WHERE id=$1",[gated.task.id]))[0];
  assert.equal(restored.status,'needs-approval');assert.equal((restored.payload as Record<string,unknown>).html,html);
  await query("UPDATE forge_jobs SET status='pending',payload=jsonb_set(payload,'{approvedPlan}','true'::jsonb) WHERE id=$1",[gated.task.id]);
  await step();await step();const publish=await step();
  assert.equal(publish.task.kind,'publish-review');assert.equal(publish.status,'needs-approval');
  assert.equal((await query("SELECT id FROM forge_jobs WHERE status='pending'",[])).length,0);
  assert.deepEqual(observed,['lead-enrichment:completed','website-audit:completed','site-plan:completed','site-generation:needs-approval','site-generation:completed','quality-review:completed','publish-review:needs-approval']);
 }finally{await db.close();await rm(path,{recursive:true,force:true})}
});
