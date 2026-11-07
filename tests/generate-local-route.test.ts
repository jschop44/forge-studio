import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {POST} from '../src/app/api/generate/route';

describe('legacy website generation uses mandatory local AI',()=>{
 it('rejects malformed input before contacting a model',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  try{
   globalThis.fetch=async()=>{calls++;throw Error('unexpected model call')};
   const request=new NextRequest('http://localhost/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'A',description:'short',template:'ember'})});
   const response=await POST(request);
   assert.equal(response.status,400);
   assert.equal(calls,0);
  }finally{globalThis.fetch=original}
 });
 it('returns a valid site using only a loopback Ollama response',async()=>{
  const original=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  const previousModel=process.env.OLLAMA_MODEL;
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   process.env.OLLAMA_MODEL='llama3.2:3b';
   globalThis.fetch=async(input,init)=>{
    assert.equal(new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url).hostname,'127.0.0.1');
    assert.equal(init?.method,'POST');
    const prompt=JSON.parse(String(init?.body)).prompt as string;
    assert.match(prompt,/Architecture/);
    assert.match(prompt,/Residential planning/);
    return new Response(JSON.stringify({response:JSON.stringify({businessName:'Cedar Studio',industry:'Creative studio',description:'A small creative studio creating distinctive websites for independent brands.',services:['Website design']})}),{status:200});
   };
   const request=new NextRequest('http://localhost/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Cedar Studio',description:'A small creative studio creating distinctive websites for independent brands.',template:'ember',industry:'Architecture',services:['Residential planning']})});
   const response=await POST(request);
   assert.equal(response.status,200);
   const result=await response.json();
   assert.equal(result.site.name,'Cedar Studio');
   assert.equal(result.site.template,'ember');
   assert.ok(result.site.sections.length>0);
  }finally{
   globalThis.fetch=original;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
   if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
  }
 });
});
