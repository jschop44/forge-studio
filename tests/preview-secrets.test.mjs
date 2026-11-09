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
test('provider failures are fatal without including provider output or secret values',()=>{
 assert.throws(()=>syncPreviewSecrets({AUTH_SECRET:'fake-test-secret'},()=>({status:1,stderr:'fake-test-secret'})),error=>{
  assert.equal(error.message.includes('fake-test-secret'),false);return true;
 });
});


test('the ecosystem signing key uses protected stdin and rejects short configuration',()=>{
 const secret='synthetic-integration-key'.repeat(2);
 assert.equal(runtimeSecrets({FORGE_INTEGRATION_SECRET:secret}).FORGE_INTEGRATION_SECRET,secret);
 assert.throws(()=>runtimeSecrets({FORGE_INTEGRATION_SECRET:'too-short'}),/at least 32/);
 syncPreviewSecrets({FORGE_INTEGRATION_SECRET:secret},(command,args,options)=>{
  assert.ok(!args.join(' ').includes(secret));assert.equal(JSON.parse(options.input).FORGE_INTEGRATION_SECRET,secret);return {status:0};
 });
});
