import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {extractWorkersCopy} from '../src/lib/server/local-ai';

describe('Cloudflare Workers AI output validation',()=>{
 const description='A local architecture studio providing residential design and planning services.';
 it('accepts plain text from Workers AI',()=>{
  assert.equal(extractWorkersCopy({response:description}),description);
 });
 it('accepts JSON and Markdown fenced JSON without leaking formatting',()=>{
  assert.equal(extractWorkersCopy({response:JSON.stringify({description})}),description);
  assert.equal(extractWorkersCopy({response:'```json\n'+JSON.stringify({description})+'\n```'}),description);
 });
 it('rejects missing, malformed and short responses rather than silently bypassing AI',()=>{
  for(const output of [null,{}, {response:''},{response:'too short'},{response:'{}'}]){
   assert.throws(()=>extractWorkersCopy(output));
  }
 });
 it('rejects excessively long model output',()=>{
  assert.throws(()=>extractWorkersCopy({response:'a'.repeat(1801)}));
 });
});
