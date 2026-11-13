import test from 'node:test';
import assert from 'node:assert/strict';
import {applyMobileHeadingRepair,MOBILE_HEADING_REPAIR_TAG} from '../src/lib/heading-overflow-repair';

test('one fixed corrective stylesheet can be appended to a reviewed site head',()=>{
 const html='<!doctype html><html><head><title>Wraps</title></head><body><main><h1>Wraps</h1></main></body></html>';
 const patched=applyMobileHeadingRepair(html);
 assert.ok(patched.includes(MOBILE_HEADING_REPAIR_TAG));
 assert.equal(applyMobileHeadingRepair(patched),patched);
 assert.equal((patched.match(/forge-mobile-heading-repair/g)||[]).length,1);
 assert.match(patched,/@media\(max-width:700px\)/);
 assert.ok(patched.includes('<title>Wraps</title>'));
});

test('repair does not synthesize a head or copy untrusted style text',()=>{
 assert.equal(applyMobileHeadingRepair('<main><h1>Wraps</h1></main>'),'<main><h1>Wraps</h1></main>');
 assert.doesNotMatch(MOBILE_HEADING_REPAIR_TAG,/(?:https?:\/\/|<script|@import|url\()/i);
});
