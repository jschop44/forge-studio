import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDiagnostic} from '../scripts/diagnose-preview-ai.mjs';
const url='https://example.test/api/ai/business?diagnostic=fixture';
test('AI diagnostic excludes unrelated requests and arbitrary private log fields',()=>{
 assert.equal(summarizeDiagnostic({event:{request:{url:'https://other.test'}}},url),null);
 const summary=summarizeDiagnostic({event:{request:{url}},logs:[
  {message:['Workers AI inference failed',{code:3016,category:'provider_failure',prompt:'PRIVATE',token:'PRIVATE'}]},
  {message:['Forge AI generation failure category:','provider_unavailable']},
  {message:['unrelated','PRIVATE']}
 ],exceptions:[{message:'PRIVATE'}]},url);
 assert.deepEqual(summary,{providerDiagnostics:[{code:'3016',category:'provider_failure'},{category:'provider_unavailable'}],exceptionCount:1,rawEventsDisclosed:false});
 assert.ok(!JSON.stringify(summary).includes('PRIVATE'));
});
test('AI diagnostic bounds malformed codes and categories without forwarding provider text',()=>{
 const summary=summarizeDiagnostic({event:{request:{url}},logs:[
  {message:['Workers AI inference failed',{code:'PRIVATE',category:'PRIVATE'}]},
  {message:['Workers AI inference failed','PRIVATE']},
  {message:['Forge AI generation failure category:','PRIVATE']}
 ]},url);
 assert.deepEqual(summary.providerDiagnostics,[{code:'unknown',category:'unknown'}]);
 assert.ok(!JSON.stringify(summary).includes('PRIVATE'));
});
