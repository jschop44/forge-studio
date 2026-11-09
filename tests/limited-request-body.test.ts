import test from 'node:test';
import assert from 'node:assert/strict';
import {limitedRequestBody,RequestBodyTooLarge} from '../src/lib/server/limited-request-body';
import {signEvent,verifySignedEvent} from '../src/lib/integrations/signature';
test('raw signatures survive multibyte UTF-8 split across stream chunks',async()=>{
 const raw=JSON.stringify({businessName:'Café 陶器 🫖'}),bytes=new TextEncoder().encode(raw);
 const stream=new ReadableStream<Uint8Array>({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close()}});
 const request=new Request('https://forge.example',{method:'POST',body:stream,duplex:'half'} as RequestInit);
 const result=await limitedRequestBody(request,16000);assert.equal(result,raw);
 const secret='synthetic-integration-secret'.repeat(2),time=String(Date.now());assert.equal(verifySignedEvent(secret,time,signEvent(secret,time,raw),result),true);
});
test('unknown-length oversized requests are cancelled before reading the entire stream',async()=>{
 let cancelled=false;const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(16001))},cancel(){cancelled=true}});
 const request=new Request('https://forge.example',{method:'POST',body:stream,duplex:'half'} as RequestInit);
 await assert.rejects(limitedRequestBody(request,16000),RequestBodyTooLarge);assert.equal(cancelled,true);
});
