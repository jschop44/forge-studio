import test from 'node:test';
import assert from 'node:assert/strict';
import {JobRequestSchema} from '../src/lib/agents/job-request';
const base={source:'forge-studio',kind:'website-audit'};
test('rejects URL-only audits and accepts explicitly supplied markup',()=>{
 assert.equal(JobRequestSchema.safeParse({...base,payload:{website:'https://example.com'}}).success,false);
 assert.equal(JobRequestSchema.safeParse({...base,payload:{website:'https://example.com',html:'<html>Supplied markup</html>'}}).success,true);
});
test('rejects empty quality review but accepts generated-page payloads',()=>{
 assert.equal(JobRequestSchema.safeParse({...base,kind:'quality-review',payload:{html:' '}}).success,false);
 assert.equal(JobRequestSchema.safeParse({...base,kind:'quality-review',payload:{pages:[{slug:'index',title:'Home',html:'<html>Review</html>'}]}}).success,true);
});
test('bounds service briefs and preserves supported optional fields',()=>{
 assert.equal(JobRequestSchema.safeParse({...base,kind:'site-plan',payload:{services:Array(13).fill('Design')}}).success,false);
 assert.equal(JobRequestSchema.safeParse({...base,kind:'site-plan',payload:{businessName:'Studio',industry:'Design',projectId:'demo'}}).success,true);
});
