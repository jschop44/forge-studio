import test from 'node:test';
import assert from 'node:assert/strict';
import {isSafeNavigationProbe} from '../workers/navigation-probe-policy.mjs';
const base='https://example.com/';
test('allows ordinary same-origin informational pages',()=>{
 assert.equal(isSafeNavigationProbe('/about',base),true);
 assert.equal(isSafeNavigationProbe('/services?category=web',base),true);
});
test('rejects potentially state-changing or sensitive navigation',()=>{
 for(const url of ['/logout','/account/delete','/unsubscribe?email=a','/checkout','/settings?action=remove','/account?token=abc','/%64elete','https://other.example/about','http://example.com/about']){
  assert.equal(isSafeNavigationProbe(url,base),false,url);
 }
});
