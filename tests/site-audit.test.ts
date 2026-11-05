import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {auditGeneratedSite} from '../src/lib/site-audit';
describe('site intelligence',()=>{
 it('flags absent metadata and conversion paths',()=>{const result=auditGeneratedSite({html:'<html><body><h1>Welcome</h1></body></html>'});assert.ok(result.score<80);assert.ok(result.findings.some(x=>x.category==='conversion'))});
 it('scores complete documents better',()=>{const simple=auditGeneratedSite({html:'<html><body>Welcome</body></html>'});const rich=auditGeneratedSite({html:'<html lang="en"><head><title>Business professional services</title><meta name="description" content="A professional business"><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://example.com"><script type="application/ld+json">{}</script></head><body><h1>Business</h1><h2>Our services</h2><p>We offer professional services and solutions</p><a href="mailto:hello@example.com">Contact</a></body></html>'});assert.ok(rich.score>simple.score)});
});
