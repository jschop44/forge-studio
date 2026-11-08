import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorkersComposition} from '../src/lib/server/workers-ai-composition';
const composition={description:'A studio providing accessible website design for local businesses.',design:{layout:'image-led',palette:'sky'}};
test('Cloudflare composition uses native JSON schema mode and accepts parsed provider objects',async()=>{
 const result=await generateWorkersComposition({run:async(model,input)=>{
  assert.equal(model,'@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.equal((input.response_format as {type:string}).type,'json_schema');
  return {response:composition};
 }},{businessName:'Cedar Studio'});
 assert.deepEqual(result,composition);
});
test('Cloudflare composition accepts JSON text and rejects invalid shapes and arbitrary code',async()=>{
 assert.deepEqual(await generateWorkersComposition({run:async()=>({response:JSON.stringify(composition)})},{}),composition);
 for(const response of ['plain marketing copy',{...composition,html:'<script>bad</script>'},{...composition,design:{layout:'invalid',palette:'sky'}},null])await assert.rejects(generateWorkersComposition({run:async()=>({response})},{}),/Workers AI returned invalid composition/);
});
test('provider errors propagate without a synthetic composition fallback',async()=>{
 await assert.rejects(generateWorkersComposition({run:async()=>{throw Error('provider unavailable')}},{}),/provider unavailable/);
});
