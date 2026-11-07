import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {POST} from '../src/app/api/generate/route';
import {POST as businessPOST} from '../src/app/api/ai/business/route';

describe('legacy website generation uses mandatory local AI',()=>{
 it('rejects malformed input before contacting a model',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  try{
   globalThis.fetch=async()=>{calls++;throw Error('unexpected model call')};
   const request=new NextRequest('http://localhost/api/generate',{method:'POST',headers:{'content-type':'application/json','origin':'http://localhost'},body:JSON.stringify({name:'A',description:'short',template:'ember'})});
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
   const request=new NextRequest('http://localhost/api/generate',{method:'POST',headers:{'content-type':'application/json','origin':'http://localhost'},body:JSON.stringify({name:'Cedar Studio',description:'A small creative studio creating distinctive websites for independent brands.',template:'ember',industry:'Architecture',services:['Residential planning']})});
   const response=await POST(request);
   assert.equal(response.status,200);
   const result=await response.json();
   assert.equal(result.site.name,'Cedar Studio');
   assert.equal(result.site.sections[0].title,'Residential planning');
   assert.equal(result.site.template,'ember');
   assert.ok(result.site.sections.length>0);
  }finally{
   globalThis.fetch=original;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
   if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;
  }
 });
 it('does not let spoofed forwarded-for headers reset the generation limit',async()=>{
  const original=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  let calls=0;
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   globalThis.fetch=async()=>{
    calls++;
    return new Response(JSON.stringify({response:JSON.stringify({businessName:'Oak Studio',industry:'Design',description:'An independent design studio serving local businesses and families.',services:['Website design']})}),{status:200});
   };
   const payload=JSON.stringify({name:'Oak Studio',description:'An independent design studio serving local businesses and families.',template:'minimal'});
   const statuses:number[]=[];
   for(let index=0;index<11;index++){
    const request=new NextRequest('http://localhost/api/generate',{method:'POST',headers:{'content-type':'application/json','origin':'http://localhost','x-forwarded-for':'192.0.2.'+index,'x-real-ip':'198.51.100.'+index},body:payload});
    statuses.push((await POST(request)).status);
   }
   assert.ok(statuses.filter(status=>status===200).length>=1);
   assert.ok(statuses.filter(status=>status===200).length<=10);
   assert.equal(statuses[10],429);
   assert.equal(calls,statuses.filter(status=>status===200).length);
  }finally{
   globalThis.fetch=original;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  }
 });
 it('rejects cross-origin requests before model inference',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  try{
   globalThis.fetch=async()=>{calls++;throw Error('unexpected model call')};
   const request=new NextRequest('http://localhost/api/generate',{method:'POST',headers:{'content-type':'application/json','origin':'https://untrusted.example'},body:JSON.stringify({name:'Oak Studio',description:'An independent design studio serving local businesses and families.',template:'minimal'})});
   const response=await POST(request);
   assert.equal(response.status,403);
   assert.equal(calls,0);
  }finally{globalThis.fetch=original}
 });
 it('rejects oversized requests before model inference',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  try{
   globalThis.fetch=async()=>{calls++;throw Error('unexpected model call')};
   const request=new NextRequest('http://localhost/api/generate',{method:'POST',headers:{'content-type':'application/json','origin':'http://localhost'},body:JSON.stringify({name:'Oak Studio',description:'X'.repeat(9000),template:'minimal'})});
   const response=await POST(request);
   assert.equal(response.status,413);
   assert.equal(calls,0);
  }finally{globalThis.fetch=original}
 });
 it('rejects whitespace-only services before contacting the local model',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  try{
   globalThis.fetch=async()=>{calls++;throw Error('unexpected model call')};
   const request=new NextRequest('http://localhost/api/generate',{method:'POST',headers:{'content-type':'application/json','origin':'http://localhost'},body:JSON.stringify({name:'Oak Studio',description:'An independent design studio serving local businesses and families.',template:'minimal',services:['  ']})});
   const response=await POST(request);
   assert.equal(response.status,400);
   assert.equal(calls,0);
  }finally{globalThis.fetch=original}
 });
 it('reports a retryable busy response when local inference capacity is exhausted',async()=>{
  const original=globalThis.fetch;
  const previousUrl=process.env.OLLAMA_URL;
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve});
  const brief={businessName:'Capacity Studio',industry:'Business',description:'An independent design studio serving local businesses and families.',services:['General services']};
  try{
   process.env.OLLAMA_URL='http://127.0.0.1:11434';
   globalThis.fetch=async()=>{
    await gate;
    return new Response(JSON.stringify({response:JSON.stringify({businessName:'Capacity Studio',industry:'Business',description:brief.description,services:['General services']})}),{status:200});
   };
   const request=()=>new NextRequest('http://localhost/api/ai/business',{method:'POST',headers:{'content-type':'application/json','origin':'http://localhost'},body:JSON.stringify(brief)});
   const first=businessPOST(request());
   const second=businessPOST(request());
   // Wait for request parsing to enter the inference stage.
   for(let i=0;i<20;i++){
    if((await import('../src/lib/server/local-ai')).localAiCapacity().active===2)break;
    await new Promise<void>(resolve=>setImmediate(resolve));
   }
   const busy=await businessPOST(request());
   assert.equal(busy.status,429);
   assert.equal(busy.headers.get('retry-after'),'5');
   release();
   await Promise.all([first,second]);
  }finally{
   release();
   globalThis.fetch=original;
   if(previousUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previousUrl;
  }
 });
});
