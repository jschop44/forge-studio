import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {executeSafeAgent} from '../src/lib/agents/execution';
import {planNextTask} from '../src/lib/agents/orchestrator';
import {reviewAgentPages} from '../src/lib/agents/quality';
import type {AgentTask} from '../src/lib/agents/types';

const base={id:'3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7c',tenantId:'f6a38971-ec2d-4809-9251-c70e44164f3e',source:'forge-studio' as const,attempt:0,createdAt:'2026-11-05T00:00:00.000Z'};
function generatedPages(){
 const result=executeSafeAgent({...base,kind:'site-generation',payload:{approvedPlan:true,businessName:'Studio',industry:'Design',summary:'Professional design services for local businesses.',services:['Planning','Design']}});
 return result.data.pages as {slug:string;title:string;html:string}[];
}
function decision(payload:Record<string,unknown>){return planNextTask({...base,kind:'quality-review',payload});}

describe('agent multi-page quality handoff',()=>{
 it('reviews every generated page before advancing to owner review',()=>{
  const pages=generatedPages();
  assert.equal(decision({pages}).next,'publish-review');
  const result=executeSafeAgent({...base,kind:'quality-review',payload:{pages}} as AgentTask);
  assert.equal((result.data.audits as unknown[]).length,4);
  const evidence=result.data.evidence as Record<string,unknown>;
  assert.equal(evidence.status,'passed');
  assert.equal(evidence.browserInteractionsVerified,false);
  assert.equal(evidence.publishingApproved,false);
 });
 it('blocks a broken later page even when the first page is healthy',()=>{
  const pages=generatedPages();pages[3].html='<p>Broken contact page</p>';
  assert.equal(decision({pages,html:pages[0].html}).status,'blocked');
  assert.equal(reviewAgentPages({pages}).evidence.status,'failed');
 });
 it('blocks broken internal links and duplicate slugs',()=>{
  const pages=generatedPages();pages[1].html+='<a href="missing.html">Missing</a>';
  assert.equal(decision({pages}).status,'blocked');
  pages[1].slug=pages[0].slug;
  assert.ok(reviewAgentPages({pages}).evidence.errors.some(e=>e.includes('Duplicate')));
 });
 it('blocks missing, empty, malformed and oversized page collections',()=>{
  for(const payload of [{},{html:''},{pages:[]},{pages:'invalid'},{pages:Array(13).fill(generatedPages()[0])}])assert.equal(decision(payload).status,'blocked');
 });
 it('supports legacy supplied HTML while preserving explicit page-list validation',()=>{
  const html=generatedPages()[0].html.replace(/href=["'][a-z0-9-]+\.html["']/g,'href="#contact"');
  assert.equal(decision({html}).status,'ready');
  assert.equal(decision({html,pages:[]}).status,'blocked');
 });
 it('does not advance a website audit when only a URL is available',()=>{
  assert.equal(planNextTask({...base,kind:'website-audit',payload:{website:'https://example.com'}}).status,'blocked');
 });
});
