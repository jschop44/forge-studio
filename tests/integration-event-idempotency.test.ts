import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesAcceptedBusinessEvent,type SignedBusinessEvent} from '../src/lib/integrations/event-idempotency';

const event:SignedBusinessEvent={
 eventId:'b9af009e-6097-4b7c-803b-456a8e20fe14',
 tenantId:'b41b5bd9-3cbe-4d6d-a6c5-94bb9beb0d81',
 source:'growth-lens',businessName:'Harbor Coffee',
 website:'https://harbor.example/',summary:'A coffee roaster supplying fresh beans.',
 consent:true
};
const saved=(input:SignedBusinessEvent=event)=>({
 tenantId:input.tenantId,source:input.source,
 payload:{businessName:input.businessName,website:input.website,summary:input.summary,eventId:input.eventId,consent:true}
});
test('exact signed event replay is idempotent and works with JSONB or JSON text storage',()=>{
 assert.equal(matchesAcceptedBusinessEvent(saved(),event),true);
 assert.equal(matchesAcceptedBusinessEvent({...saved(),payload:JSON.stringify(saved().payload)},event),true);
 assert.equal(matchesAcceptedBusinessEvent({...saved(),tenantId:event.tenantId.toUpperCase()},event),true);
});
test('event ID collision from a second tenant or app is rejected',()=>{
 assert.equal(matchesAcceptedBusinessEvent({...saved(),tenantId:'d2981a9e-7f60-4653-8782-b9b9443fbda1'},event),false);
 assert.equal(matchesAcceptedBusinessEvent({...saved(),source:'leadflow'},event),false);
});
test('reusing the event ID with different company facts or consent is rejected',()=>{
 for(const changed of [
  {...event,businessName:'Unrelated Company'},
  {...event,website:'https://other.example/'},
  {...event,summary:'Different approved content'},
  {...event,eventId:'f74e0d16-a9ba-4051-8f35-915710e32d13'}
 ])assert.equal(matchesAcceptedBusinessEvent(saved(),changed),false);
 assert.equal(matchesAcceptedBusinessEvent({...saved(),payload:{...saved().payload,consent:false}},event),false);
});
test('malformed stored payloads fail closed, never claiming a successful duplicate',()=>{
 for(const payload of [null,[],42,'not json','{"bad":true}',{businessName:'Harbor Coffee'}])
  assert.equal(matchesAcceptedBusinessEvent({...saved(),payload},event),false);
});
