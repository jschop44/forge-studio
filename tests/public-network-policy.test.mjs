import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublicAddress} from '../workers/public-network-policy.mjs';
test('allows ordinary public IPv4 and IPv6',()=>{
 assert.equal(isPublicAddress('8.8.8.8'),true);
 assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
});
test('rejects private, link-local, loopback, reserved and documentation ranges',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','198.18.0.1','203.0.113.2','192.0.0.10','192.0.0.200','192.0.2.1','198.51.100.4','::1','fc00::1','fe80::1','2001:db8::1','::ffff:127.0.0.1'])assert.equal(isPublicAddress(ip),false,ip);
});
