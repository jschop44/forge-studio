import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAgentAuditSource,prepareAgentAudit,AuditSourceError} from '../src/lib/server/agent-audit-source';
import {PublicSiteHttpError,type fetchPublicText} from '../src/lib/server/public-site-fetch';
import {evaluateAgentTask} from '../src/lib/agents/evaluate';
import {nextAgentStage} from '../src/lib/agents/handoff';
import {agentRetryDelay} from '../src/lib/agents/retry';
import type {AgentTask} from '../src/lib/agents/types';
const task:AgentTask={id:'3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7c',tenantId:'f6a38971-ec2d-4809-9251-c70e44164f3e',source:'leadflow',kind:'website-audit',attempt:0,createdAt:'2026-11-05T00:00:00.000Z',payload:{businessName:'Example Studio',website:'https://example.org',summary:'Public website design services'}};
const html='<!doctype html><html lang="en"><head><title>Example Studio</title></head><body><h1>Website design services</h1></body></html>';

test('URL-only external handoffs collect permitted HTML and preserve evidence into planning',async()=>{
 const calls:string[]=[];
 const read:typeof fetchPublicText=async(url,options)=>{calls.push(url.pathname);assert.equal(options.redirects,0);assert.ok(options.maxBytes<=250000);return {url,body:url.pathname==='/robots.txt'?'User-agent: *\nAllow: /':html}};
 const prepare=(input:AgentTask)=>prepareAgentAudit(input,website=>collectAgentAuditSource(website,read),async()=>({status:'identified',industry:'Website design',services:['Website design']}));
 const result=await evaluateAgentTask(task,undefined,undefined,prepare);
 assert.deepEqual(calls,['/robots.txt','/']);assert.equal(result.decision.next,'site-plan');assert.ok(result.output?.data.audit);
 const next=nextAgentStage(result.task,result.decision,result.output)!;
 assert.equal(next.payload.html,html);assert.equal((next.payload.sourceObservation as {url:string}).url,'https://example.org/');assert.equal(task.payload.html,undefined);
});

test('supplied HTML never triggers another external request',async()=>{
 const supplied={...task,payload:{...task.payload,html,industry:'Design',services:['Website design']}};
 assert.deepEqual(await prepareAgentAudit(supplied,async()=>{throw Error('Unexpected external request')}),supplied);
});

test('robots disallow, unavailable policy and unsafe destinations never fetch a page',async()=>{
 for(const rules of ['User-agent: *\nDisallow: /','<html>Access challenge</html>','User-agent: *\nCrawl-delay: 60']){
  let calls=0;await assert.rejects(collectAgentAuditSource('https://example.org',async url=>{calls++;return {url,body:rules}}));assert.equal(calls,1);
 }
 let calls=0;await assert.rejects(collectAgentAuditSource('https://127.0.0.1',async url=>{calls++;return {url,body:html}}));assert.equal(calls,0);
 const policyFailure:typeof fetchPublicText=async()=>{throw new PublicSiteHttpError(503)};
 await assert.rejects(collectAgentAuditSource('https://example.org',policyFailure),error=>error instanceof AuditSourceError&&error.retryable);
});

test('missing robots is handled explicitly and transient page failures retain bounded retries',async()=>{
 const evidence=await collectAgentAuditSource('https://example.org',async url=>{if(url.pathname==='/robots.txt')throw new PublicSiteHttpError(404);return {url,body:html}});
 assert.equal(evidence.html,html);
 const prepare=(input:AgentTask)=>prepareAgentAudit(input,async()=>{throw new AuditSourceError('Provider unavailable',true)});
 await assert.rejects(evaluateAgentTask(task,undefined,undefined,prepare),/AUDIT_SOURCE_TRANSIENT/);
 assert.equal(agentRetryDelay(Error('AUDIT_SOURCE_TRANSIENT'),0,3),60);assert.equal(agentRetryDelay(Error('AUDIT_SOURCE_TRANSIENT'),3,3),null);
});

test('collection remains bounded and capacity recovers after completion',async()=>{
 const releases:(()=>void)[]=[];
 const read:typeof fetchPublicText=async url=>{if(url.pathname==='/robots.txt')await new Promise<void>(r=>releases.push(r));return {url,body:url.pathname==='/robots.txt'?'':html}};
 const first=collectAgentAuditSource('https://one.example.org',read),second=collectAgentAuditSource('https://two.example.org',read);
 await assert.rejects(collectAgentAuditSource('https://three.example.org',read),error=>error instanceof AuditSourceError&&error.retryable);
 releases.forEach(r=>r());await Promise.all([first,second]);
 assert.equal((await collectAgentAuditSource('https://three.example.org',async url=>({url,body:url.pathname==='/robots.txt'?'':html}))).html,html);
});

test('open-ended recognition enriches missing facts from source metadata without overriding supplied facts',async()=>{
 const supplied={...task,payload:{...task.payload,html,industry:'Independent website design'}};
 const prepared=await prepareAgentAudit(supplied,async()=>{throw Error('Unexpected external request')},async input=>{
  assert.ok(input.brief.includes('Website design services'));assert.ok(!input.brief.includes('<html'));
  return {status:'identified',industry:'Website design',services:['Website design']};
 });
 assert.equal(prepared.payload.industry,'Independent website design');assert.deepEqual(prepared.payload.services,['Website design']);
});
test('ambiguous identity stays blocked for owner clarification rather than using a generic business',async()=>{
 const prepare=(input:AgentTask)=>prepareAgentAudit(input,async website=>({website,html,observedAt:'2026-11-09T00:00:00Z'}),async()=>({status:'needs-context',industry:'Unclear',services:[]}));
 const result=await evaluateAgentTask(task,undefined,undefined,prepare);
 assert.equal(result.decision.status,'blocked');assert.equal(result.output,null);assert.match(result.decision.reason,/owner confirmation/);
});
