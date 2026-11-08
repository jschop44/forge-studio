import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {retryAgentJob} from '../src/lib/server/agent-job-retry';
import {settleAgentJob,type JobClaim,type JobSettlement} from '../src/lib/server/agent-job-settlement';

const parent='3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7c',tenant='f6a38971-ec2d-4809-9251-c70e44164f3e',child='3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7d';
const claim:JobClaim={id:parent,tenantId:tenant,attempt:0,lease:'2026-11-08 00:00:00.123456+00'};
const settlement:JobSettlement={status:'completed',result:{stage:'site-generation',data:{pages:[]}},reason:'Ready for quality review',next:{id:child,kind:'quality-review',payload:{pages:[{slug:'home',html:'content'}]}}};

describe('atomic Postgres agent handoffs',()=>{
 let db:PGlite;
 const query=async(text:string,values:unknown[])=>(await db.query<Record<string,unknown>>(text,values)).rows;
 before(async()=>{
  db=new PGlite();
  await db.exec(`CREATE TABLE forge_jobs (
   id uuid PRIMARY KEY, tenant_id uuid NOT NULL, parent_id uuid REFERENCES forge_jobs(id),
   kind text NOT NULL CHECK(kind <> 'publish-review'), source text NOT NULL,
   payload jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'pending',
   result jsonb, last_error text, attempt integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 3, available_at timestamptz NOT NULL DEFAULT now(),
   updated_at timestamptz NOT NULL DEFAULT now()
  ); CREATE UNIQUE INDEX parent_kind ON forge_jobs(parent_id,kind) WHERE parent_id IS NOT NULL;`);
 });
 after(async()=>{await db.close()});
 beforeEach(async()=>{
  await db.exec('TRUNCATE forge_jobs');
  await db.query("INSERT INTO forge_jobs(id,tenant_id,kind,source,status,updated_at) VALUES($1,$2,'site-generation','forge-studio','evaluating',$3)",[parent,tenant,claim.lease]);
 });
 it('schedules one fenced retry with backoff and preserves the payload',async()=>{
  assert.equal(await retryAgentJob(query,claim,120),true);
  assert.equal(await retryAgentJob(query,claim,120),false);
  const rows=await query('SELECT status,attempt,payload,available_at>now() AS delayed FROM forge_jobs',[]);
  assert.equal(rows[0].status,'pending');assert.equal(rows[0].attempt,1);
  assert.equal(rows[0].delayed,true);assert.deepEqual(rows[0].payload,{});
 });
 it('rejects retries for stale leases, wrong tenants and exhausted attempts',async()=>{
  assert.equal(await retryAgentJob(query,{...claim,tenantId:child},60),false);
  assert.equal(await retryAgentJob(query,{...claim,lease:'2026-11-08 00:00:00+00'},60),false);
  await db.exec('UPDATE forge_jobs SET attempt=3');
  assert.equal(await retryAgentJob(query,{...claim,attempt:3},60),false);
  assert.equal((await query('SELECT status FROM forge_jobs',[]))[0].status,'evaluating');
 });
 it('commits the stage result and preserves all successor payload data',async()=>{
  assert.equal(await settleAgentJob(query,claim,settlement),true);
  const rows=await query('SELECT * FROM forge_jobs ORDER BY parent_id NULLS FIRST',[]);
  assert.equal(rows[0].status,'completed');assert.deepEqual(rows[0].result,settlement.result);
  assert.equal(rows[1].parent_id,parent);assert.equal(rows[1].tenant_id,tenant);
  assert.equal(rows[1].status,'pending');assert.deepEqual(rows[1].payload,settlement.next?.payload);
 });
 it('rolls back completion when successor insertion fails',async()=>{
  await assert.rejects(settleAgentJob(query,claim,{...settlement,next:{...settlement.next!,kind:'publish-review'}}));
  const rows=await query('SELECT * FROM forge_jobs',[]);
  assert.equal(rows.length,1);assert.equal(rows[0].status,'evaluating');assert.equal(rows[0].result,null);
 });
 it('does not settle the same claim twice or duplicate the next stage',async()=>{
  assert.equal(await settleAgentJob(query,claim,settlement),true);
  assert.equal(await settleAgentJob(query,claim,{...settlement,next:{...settlement.next!,id:'3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7e'}}),false);
  assert.equal((await query('SELECT id FROM forge_jobs',[])).length,2);
 });
 it('rejects stale leases, changed attempts, and different tenants',async()=>{
  for(const stale of [{...claim,lease:'2026-11-08 00:00:00.123455+00'},{...claim,attempt:1},{...claim,tenantId:child}]){
   assert.equal(await settleAgentJob(query,stale,settlement),false);
  }
  assert.equal((await query('SELECT status FROM forge_jobs',[]))[0].status,'evaluating');
 });
 it('records approval or failure without creating a successor',async()=>{
  assert.equal(await settleAgentJob(query,claim,{status:'needs-approval',result:null,reason:'Owner approval required'}),true);
  const rows=await query('SELECT status FROM forge_jobs',[]);assert.equal(rows.length,1);assert.equal(rows[0].status,'needs-approval');
 });
 it('rejects advancing blocked stages',async()=>{
  await assert.rejects(settleAgentJob(query,claim,{...settlement,status:'blocked'}));
  assert.equal((await query('SELECT status FROM forge_jobs',[]))[0].status,'evaluating');
 });
});
