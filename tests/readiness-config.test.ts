import test from 'node:test';
import assert from 'node:assert/strict';
import {readinessConfig} from '../src/lib/server/readiness-config';
test('reports absent configuration by name only',()=>{assert.deepEqual(readinessConfig({}),{configured:false,missing:['DATABASE_URL','AUTH_SECRET']})});
test('rejects short signing secrets without exposing values',()=>{
 const result=readinessConfig({DATABASE_URL:'postgres://private',AUTH_SECRET:'private'});
 assert.deepEqual(result,{configured:false,missing:['AUTH_SECRET']});
 assert.equal(JSON.stringify(result).includes('private'),false);
});
test('accepts configured database and signing secret',()=>{assert.deepEqual(readinessConfig({DATABASE_URL:'postgres://test',AUTH_SECRET:'x'.repeat(32)}),{configured:true,missing:[]})});
