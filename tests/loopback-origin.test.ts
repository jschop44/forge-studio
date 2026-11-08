import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {sameOrigin} from '../src/lib/server/request-security';
function request(origin:string,host='127.0.0.1:3000'){return new NextRequest('http://localhost:3000/api/ai/business',{headers:{origin,host}})}
test('allows exact loopback host when development server rewrites request URL',()=>{assert.equal(sameOrigin(request('http://127.0.0.1:3000')),true)});
test('rejects different origins and ports',()=>{for(const origin of ['http://evil.example','http://127.0.0.1:4000','https://evil.example'])assert.equal(sameOrigin(request(origin)),false)});
test('does not allow HTTP host fallback for public hosts',()=>{assert.equal(sameOrigin(request('http://forge.example','forge.example')),false)});
