import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {executeSafeAgent} from '../src/lib/agents/execution';
import type {AgentTask} from '../src/lib/agents/types';
const base={id:'3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7c',tenantId:'f6a38971-ec2d-4809-9251-c70e44164f3e',source:'forge-studio',attempt:0,createdAt:'2026-11-05T00:00:00.000Z'};
describe('safe agent stages',()=>{
 it('produces a site plan without external APIs',()=>{const task={...base,kind:'site-plan',payload:{industry:'fashion'}} as AgentTask;assert.deepEqual(executeSafeAgent(task).data.pages,['Home','Services','About','Contact'])});
 it('rejects unapproved generation',()=>{const task={...base,kind:'site-generation',payload:{}} as AgentTask;assert.throws(()=>executeSafeAgent(task))});
 it('generates a draft after plan approval',()=>{const task={...base,kind:'site-generation',payload:{approvedPlan:true,businessName:'Studio',industry:'Design',summary:'We provide thoughtful professional design services.',services:['Planning']}} as AgentTask;assert.equal((executeSafeAgent(task).data.pages as unknown[]).length,4)});
});
