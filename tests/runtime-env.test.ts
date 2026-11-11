import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimeValue} from '../src/lib/server/runtime-env';
test('reads Worker bindings even when Node environment lacks configuration',()=>{assert.equal(runtimeValue('AUTH_SECRET',{},()=>({AUTH_SECRET:'test-binding'})),'test-binding')});
test('Worker configuration takes precedence over build process values',()=>{assert.equal(runtimeValue('AUTH_SECRET',{AUTH_SECRET:'stale'},()=>({AUTH_SECRET:'current'})),'current')});
test('supports Node migrations and absent values without Worker context',()=>{const absent=()=>{throw Error('no worker')};assert.equal(runtimeValue('DATABASE_URL',{DATABASE_URL:'test-local'},absent),'test-local');assert.equal(runtimeValue('AUTH_SECRET',{},absent),undefined)});
test('ignores non-string bindings and does not stringify secret objects',()=>{assert.equal(runtimeValue('AUTH_SECRET',{},()=>({AUTH_SECRET:{secret:'private'}})),undefined)});


test('the signed ecosystem context switch honors Worker runtime configuration over Node defaults',()=>{
 const name='ENABLE_ECOSYSTEM_INTEGRATION';
 assert.equal(runtimeValue(name,{[name]:'false'},()=>({[name]:'true'})),'true');
 assert.equal(runtimeValue(name,{[name]:'true'},()=>({[name]:'false'})),'false');
 assert.equal(runtimeValue(name,{},()=>({[name]:'true'})),'true');
});


test('business publishing remains opt-in and honors request-time Worker switches',()=>{
 const name='ENABLE_BUSINESS_PUBLISHING';
 assert.equal(runtimeValue(name,{[name]:'true'},()=>({[name]:'false'})),'false');
 assert.equal(runtimeValue(name,{[name]:'false'},()=>({[name]:'true'})),'true');
 assert.equal(runtimeValue(name,{},()=>({})),undefined);
});
