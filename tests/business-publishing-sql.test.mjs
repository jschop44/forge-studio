import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLocalBusinessPublishingSql} from '../scripts/business-publishing-sql-acceptance.mjs';

test('actual publication SQL preserves revisions, ownership, atomicity and rollback-only fixture cleanup',{timeout:60000},async()=>{
 const result=await verifyLocalBusinessPublishingSql();
 assert.ok(result.checks>=24);
 assert.equal(result.remainingFixtureRows,0);
});
