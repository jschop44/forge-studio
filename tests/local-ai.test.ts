import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {generateWithLocalAi} from '../src/lib/server/local-ai';
describe('free AI generation fallback',()=>{
 it('generates a complete business site without external AI charges',async()=>{const previous=process.env.ENABLE_LOCAL_AI;process.env.ENABLE_LOCAL_AI='false';try{const result=await generateWithLocalAi({businessName:'Cedar Studio',industry:'Design',description:'A small creative studio helping local businesses grow.',services:['Website design','Brand strategy']});assert.equal(result.provider,'deterministic');assert.equal(result.pages.length,4);assert.ok(result.pages[0].html.includes('application/ld+json'))}finally{if(previous===undefined)delete process.env.ENABLE_LOCAL_AI;else process.env.ENABLE_LOCAL_AI=previous}});
});
