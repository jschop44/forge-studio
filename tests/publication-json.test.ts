import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationJson,PublicationJsonError,ROLLBACK_BODY_LIMIT} from '../src/lib/server/publication-json';
function streamed(chunks:Uint8Array[],cancel?:()=>void){
 return new Request('https://forge.example/api/business/publish',{method:'POST',body:new ReadableStream({start(c){for(const chunk of chunks)c.enqueue(chunk);c.close()},cancel}),duplex:'half'} as RequestInit);
}
const encode=(text:string)=>new TextEncoder().encode(text);
test('publication parsing retains valid multilingual content across byte boundaries',async()=>{
 const body={ownerApproved:true,businessName:'Café 陶器',pages:[{slug:'index',html:'<h1>🫖</h1>'}]};
 assert.deepEqual(await publicationJson(streamed([...encode(JSON.stringify(body))].map(byte=>new Uint8Array([byte])))),body);
});
test('chunked oversize publication is rejected and cancelled before JSON parsing',async()=>{
 let cancelled=false;
 const request=new Request('https://forge.example',{method:'POST',body:new ReadableStream({start(c){c.enqueue(new Uint8Array(ROLLBACK_BODY_LIMIT+1))},cancel(){cancelled=true}}),duplex:'half'} as RequestInit);
 await assert.rejects(publicationJson(request,ROLLBACK_BODY_LIMIT),(error:unknown)=>error instanceof PublicationJsonError&&error.status===413);
 assert.equal(cancelled,true);
});
test('advertised oversized requests are cancelled without consuming input',async()=>{
 let cancelled=false;
 const request=new Request('https://forge.example',{method:'POST',headers:{'content-length':'99999'},body:new ReadableStream({cancel(){cancelled=true}}),duplex:'half'} as RequestInit);
 await assert.rejects(publicationJson(request,4096),(error:unknown)=>error instanceof PublicationJsonError&&error.status===413);
 assert.equal(cancelled,true);
});
test('malformed JSON, empty bodies and invalid UTF-8 produce a client error',async()=>{
 for(const bytes of [encode('{'),encode(''),new Uint8Array([0xc3,0x28])]){
  await assert.rejects(publicationJson(streamed([bytes])),(error:unknown)=>error instanceof PublicationJsonError&&error.status===400);
 }
});
test('accepts a rollback exactly within its raw byte budget',async()=>{
 const text=JSON.stringify({version:1,expectedVersion:2});
 assert.deepEqual(await publicationJson(streamed([encode(text)]),encode(text).length),{version:1,expectedVersion:2});
});
