import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function verifyDeployedRevision(health, expected) {
  if (!/^[a-f0-9]{40}$/.test(expected || '')) throw new Error('Expected a full verified commit SHA');
  if (health?.ok !== true || health?.service !== 'forge-studio') throw new Error('Forge health check failed');
  if (health.revision !== expected) throw new Error('Live source revision differs from verified source');
  return expected;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const revision = verifyDeployedRevision(JSON.parse(readFileSync(process.argv[2], 'utf8')), process.env.FORGE_EXPECTED_REVISION);
  console.log(`Live source revision verified: ${revision}`);
}
