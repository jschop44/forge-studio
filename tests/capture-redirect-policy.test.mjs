import test from 'node:test';
import assert from 'node:assert/strict';
import {isAuthorizedCaptureDestination} from '../workers/capture-redirect-policy.mjs';
test('allows only HTTPS same-origin read-only capture destinations',()=>{
 assert.equal(isAuthorizedCaptureDestination('https://example.com/about?x=1','https://example.com'),true);
 for(const url of ['https://other.example.com/','http://example.com/','https://example.com.evil.test/','https://user@example.com/','https://example.com:8443/','javascript:alert(1)','not-a-url']){
  assert.equal(isAuthorizedCaptureDestination(url,'https://example.com'),false,url);
 }
});
test('rejects malformed or insecure capture origin',()=>{
 assert.equal(isAuthorizedCaptureDestination('https://example.com','http://example.com'),false);
 assert.equal(isAuthorizedCaptureDestination('https://example.com','invalid'),false);
});
