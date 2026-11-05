import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {signEvent,verifySignedEvent} from '../src/lib/integrations/signature';
describe('signed ecosystem event security',()=>{
 const secret='a'.repeat(64),body='{"eventId":"00000000-0000-4000-8000-000000000000"}',now=1762323000000,timestamp=String(now);
 it('accepts a valid HMAC signature within the replay window',()=>assert.equal(verifySignedEvent(secret,timestamp,signEvent(secret,timestamp,body),body,now),true));
 it('rejects tampering and invalid signatures',()=>{const sig=signEvent(secret,timestamp,body);assert.equal(verifySignedEvent(secret,timestamp,sig,body+' ',now),false);assert.equal(verifySignedEvent(secret,timestamp,'0'.repeat(64),body,now),false)});
 it('rejects expired or future requests',()=>{const sig=signEvent(secret,timestamp,body);assert.equal(verifySignedEvent(secret,timestamp,sig,body,now+301000),false);assert.equal(verifySignedEvent(secret,timestamp,sig,body,now-301000),false)});
 it('rejects weak secrets and oversized payloads',()=>{assert.equal(verifySignedEvent('weak',timestamp,signEvent(secret,timestamp,body),body,now),false);assert.equal(verifySignedEvent(secret,timestamp,signEvent(secret,timestamp,'x'.repeat(16001)),'x'.repeat(16001),now),false)});
});
