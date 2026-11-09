import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {planNextTask} from '../src/lib/agents/orchestrator';
import {executeSafeAgent} from '../src/lib/agents/execution';
import type {AgentTask} from '../src/lib/agents/types';
const base={id:'3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7c',tenantId:'f6a38971-ec2d-4809-9251-c70e44164f3e',source:'leadflow',attempt:0,createdAt:'2026-11-05T00:00:00.000Z'};
function task(kind:AgentTask['kind'],payload:Record<string,unknown>):AgentTask{return {...base,kind,payload} as AgentTask}
describe('ecosystem pipeline contract',()=>{
 it('routes a lead through audit and plan stages',()=>{const lead=task('lead-enrichment',{businessName:'Example',website:'https://example.com'});assert.equal(planNextTask(lead).next,'website-audit');assert.equal(executeSafeAgent(lead).data.businessName,'Example');assert.equal(planNextTask(task('website-audit',{...lead.payload,html:'<!doctype html><html><head><title>Example business</title></head><body><h1>Example</h1></body></html>'})).next,'site-plan');assert.equal(planNextTask(task('site-plan',lead.payload)).next,'site-generation')});
 it('blocks unapproved site generation and publication',()=>{assert.equal(planNextTask(task('site-generation',{businessName:'Example'})).status,'needs-approval');assert.equal(planNextTask(task('publish-review',{})).status,'needs-approval')});
 it('produces a reviewable website after approval',()=>{const result=executeSafeAgent(task('site-generation',{approvedPlan:true,businessName:'Example Studio',industry:'Design',summary:'We design innovative websites for independent businesses.',services:['Design']}));assert.equal((result.data.pages as unknown[]).length,4);assert.equal(planNextTask(task('site-generation',{approvedPlan:true})).status,'blocked')});
});
