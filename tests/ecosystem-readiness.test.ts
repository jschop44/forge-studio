import test from 'node:test';
import assert from 'node:assert/strict';
import {ecosystemReadiness} from '../src/lib/server/ecosystem-readiness';
test('integration diagnostics distinguish disabled, missing configuration and configured bindings without revealing credentials',()=>{
 const config:Record<string,string>={};const read=(name:string)=>config[name];
 assert.equal(ecosystemReadiness(read).status,'disabled');config.ENABLE_ECOSYSTEM_INTEGRATION='true';
 assert.equal(ecosystemReadiness(read).status,'not-configured');
 config.FORGE_INTEGRATION_SECRET='synthetic-secret'.repeat(4);config.DATABASE_URL='postgresql://private-test';
 const result=ecosystemReadiness(read);assert.equal(result.status,'configured');assert.equal(result.requiresConsent,true);
 assert.ok(!JSON.stringify(result).includes(config.FORGE_INTEGRATION_SECRET));assert.ok(!JSON.stringify(result).includes(config.DATABASE_URL));
});
