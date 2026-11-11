import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const run=input=>spawnSync(process.execPath,['--import','tsx','scripts/live-business-publishing-acceptance.mjs'],{input,encoding:'utf8',timeout:15000});
test('live acceptance cannot silently pass without explicit credential input',()=>{
 const result=run('');assert.equal(result.status,1);assert.match(result.stdout,/Secure stdin credential input required/);
});
test('live acceptance refuses a production/default branch selection before connecting',()=>{
 const result=run(JSON.stringify({branchId:'main'})+'\n');assert.equal(result.status,1);assert.match(result.stdout,/explicit approved isolated branch/);
});
test('live acceptance refuses an unapproved database endpoint before connecting',()=>{
 const result=run(JSON.stringify({branchId:'br-nameless-lake-bb8rrmnk',connectionString:'postgresql://unapproved.invalid/neondb'})+'\n');
 assert.equal(result.status,1);assert.match(result.stdout,/approved isolated endpoint/);
});
