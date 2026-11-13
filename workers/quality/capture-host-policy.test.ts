import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedCaptureHosts} from './capture-host-policy';
import {qualityWorkerBindHost} from './bind-host';

test('capture authorizes only the requested public HTTPS site by default',()=>{
 assert.deepEqual(approvedCaptureHosts('https://www.bestbuy.com/site/electronics'),['www.bestbuy.com']);
 assert.deepEqual(approvedCaptureHosts('https://www.disney.com/'),['www.disney.com']);
});
test('explicit operator host allowlist is restrictive, not a way to add unauthorized origins',()=>{
 assert.deepEqual(approvedCaptureHosts('https://www.example.com/', ['www.example.com','images.example.com']),['www.example.com','images.example.com']);
 assert.throws(()=>approvedCaptureHosts('https://other.example.com/', ['www.example.com']),/not authorized/);
 assert.throws(()=>approvedCaptureHosts('https://www.example.com/', ['www.example.com','OTHER.EXAMPLE.COM']),/Invalid capture host/);
});
test('private, credentialed and local source URLs are rejected',()=>{
 for(const url of ['http://example.com','https://127.0.0.1/','https://localhost.local/','https://me:password@example.com/','https://example.com:8443/']){
  assert.throws(()=>approvedCaptureHosts(url));
 }
});
test('Render quality worker binding requires explicit opt-in',()=>{
 assert.equal(qualityWorkerBindHost(),'127.0.0.1');
 assert.equal(qualityWorkerBindHost('127.0.0.1'),'127.0.0.1');
 assert.equal(qualityWorkerBindHost('0.0.0.0'),'0.0.0.0');
 assert.throws(()=>qualityWorkerBindHost('::'),/Invalid quality worker binding/);
});
