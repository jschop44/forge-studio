import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {planNextTask} from '../src/lib/agents/orchestrator';
import {LeadFormSchema} from '../src/lib/lead-forms';
const base={id:'3c26d0bb-c4e7-4884-bbf4-8592c3cdbf7c',tenantId:'f6a38971-ec2d-4809-9251-c70e44164f3e',source:'forge-studio',payload:{},createdAt:'2026-11-05T00:00:00.000Z'};
describe('agent policy',()=>{
 it('requires human approval for publication',()=>{assert.equal(planNextTask({...base,kind:'publish-review'}).status,'needs-approval')});
 it('blocks audits without website',()=>{assert.equal(planNextTask({...base,kind:'website-audit'}).status,'blocked')});
 it('requires approved plan before generation',()=>{assert.equal(planNextTask({...base,kind:'site-generation'}).status,'needs-approval')});
});
describe('lead validation',()=>{it('rejects invalid email',()=>{assert.equal(LeadFormSchema.safeParse({name:'A',email:'bad',message:'Hello'}).success,false)})});
