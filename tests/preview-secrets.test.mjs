import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runtimeSecrets,syncPreviewSecrets} from '../scripts/sync-preview-secrets.mjs';

test('missing runtime secrets preserve existing Worker settings without calling provider',()=>{
 let called=false;
 assert.equal(syncPreviewSecrets({},()=>{called=true}),false);
 assert.equal(called,false);
 assert.deepEqual(runtimeSecrets({DATABASE_URL:' ',UNRELATED:'private'}),{});
});
test('only supplied allowlisted secrets travel over stdin, never command arguments',()=>{
 const env={DATABASE_URL:'postgres://example.invalid/test',AUTH_SECRET:'fake-test-secret',UNRELATED:'not-for-worker'};
 let calls=0;
 assert.equal(syncPreviewSecrets(env,(command,args,options)=>{
  calls++;
  assert.equal(command,'npx');assert.deepEqual(args,['wrangler','secret','bulk']);
  assert.deepEqual(JSON.parse(options.input),{DATABASE_URL:env.DATABASE_URL,AUTH_SECRET:env.AUTH_SECRET});
  assert.deepEqual(options.stdio,['pipe','pipe','pipe']);return {status:0};
 }),true);
 assert.equal(calls,1);
});
test('transient provider failures use only two bounded retries with protected stdin',()=>{
 const secret='synthetic-secret-value',env={FORGE_WORKER_SECRET:secret};
 let attempts=0;const pauses=[];
 const ok=syncPreviewSecrets(env,(command,args,options)=>{
  attempts++;
  assert.equal(command,'npx');assert.deepEqual(args,['wrangler','secret','bulk']);
  assert.deepEqual(JSON.parse(options.input),{FORGE_WORKER_SECRET:secret});
  assert.equal(args.join(' ').includes(secret),false);
  return {status:attempts===3?0:1,stderr:secret};
 },ms=>pauses.push(ms));
 assert.equal(ok,true);assert.equal(attempts,3);assert.deepEqual(pauses,[800,1600]);
});
test('provider failures remain fatal after bounded attempts without exposing secrets',()=>{
 let attempts=0;const pauses=[];
 assert.throws(()=>syncPreviewSecrets({AUTH_SECRET:'fake-test-secret'},()=>{attempts++;return {status:1,stderr:'fake-test-secret'}},ms=>pauses.push(ms)),error=>{
  assert.equal(error.message.includes('fake-test-secret'),false);
  assert.match(error.message,/after 3 attempts/);return true;
 });
 assert.equal(attempts,3);assert.deepEqual(pauses,[800,1600]);
});


test('the ecosystem signing key uses protected stdin and rejects short configuration',()=>{
 const secret='synthetic-integration-key'.repeat(2);
 assert.equal(runtimeSecrets({FORGE_INTEGRATION_SECRET:secret}).FORGE_INTEGRATION_SECRET,secret);
 assert.throws(()=>runtimeSecrets({FORGE_INTEGRATION_SECRET:'too-short'}),/at least 32/);
 syncPreviewSecrets({FORGE_INTEGRATION_SECRET:secret},(command,args,options)=>{
  assert.ok(!args.join(' ').includes(secret));assert.equal(JSON.parse(options.input).FORGE_INTEGRATION_SECRET,secret);return {status:0};
 });
});
