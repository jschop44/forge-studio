import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyDeployedRevision} from '../scripts/verify-deployed-revision.mjs';
const sha = 'a'.repeat(40);
const healthy = {ok:true, service:'forge-studio', revision:sha};
test('accepts only the exact source built by the verified deployment', () => {
  assert.equal(verifyDeployedRevision(healthy, sha), sha);
});
test('rejects healthy older builds, absent attestations and unknown local builds', () => {
  for (const revision of ['b'.repeat(40), undefined, 'unknown']) {
    assert.throws(() => verifyDeployedRevision({...healthy, revision}, sha), /differs/);
  }
});
test('rejects unhealthy responses and invalid expected source identifiers', () => {
  for (const response of [null, {...healthy, ok:false}, {...healthy, service:'other'}]) {
    assert.throws(() => verifyDeployedRevision(response, sha), /health/);
  }
  for (const expected of [undefined, '', 'main', 'a'.repeat(7)]) {
    assert.throws(() => verifyDeployedRevision(healthy, expected), /full verified/);
  }
});
