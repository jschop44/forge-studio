import {test} from 'node:test';
import assert from 'node:assert/strict';
import {designAdvice,notifyGeneration} from '../src/lib/server/workflow-adapters';
const brief={industry:'Baseball equipment',services:['Bats','Gloves']};
test('optional advisors are disabled by default and reject untrusted output',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return Response.json({text:'{"layout":"image-led","html":"unsafe"}'})};
 assert.deepEqual(await designAdvice(brief,{env:{},fetcher}),{status:'not-configured'});assert.equal(calls,0);
 const env={FORGE_DESIGN_ADVISOR:'flowise',FLOWISE_PREDICTION_URL:'https://flows.example/api/v1/prediction/test-flow',FLOWISE_API_KEY:'private'};
 assert.deepEqual(await designAdvice(brief,{env,fetcher}),{status:'unavailable'});
 assert.deepEqual(await designAdvice(brief,{env:{...env,FLOWISE_PREDICTION_URL:'http://flows.example/api/v1/prediction/test-flow'},fetcher}),{status:'unavailable'});assert.equal(calls,1);
});
test('Dify and Flowise use their own protocols and return only a bounded layout',async()=>{
 for(const provider of ['dify','flowise']){
  const env={FORGE_DESIGN_ADVISOR:provider,DIFY_WORKFLOW_URL:'https://dify.example/v1/workflows/run',DIFY_API_KEY:'private',FLOWISE_PREDICTION_URL:'https://flows.example/api/v1/prediction/test-flow',FLOWISE_API_KEY:'private'};
  const result=await designAdvice(brief,{env,fetcher:async(url,init)=>{
   const body=JSON.parse(String(init?.body));assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer private');assert.equal(init?.redirect,'error');assert.ok(init?.signal);
   if(provider==='dify'){assert.equal(new URL(String(url)).pathname,'/v1/workflows/run');assert.deepEqual(body.inputs,{industry:brief.industry,services:'Bats; Gloves'});assert.equal(body.response_mode,'blocking');return Response.json({data:{status:'succeeded',outputs:{layout:'image-led'}}})}
   assert.equal(body.streaming,false);assert.ok(body.question.includes('Baseball equipment'));assert.equal(body.overrideConfig,undefined);return Response.json({text:'{"layout":"image-led"}'});
  }});assert.deepEqual(result,{status:'applied',layout:'image-led'});
 }
});
test('Activepieces receives only draft status, never approval or private site content',async()=>{
 const event={id:'0e537d58-f720-44f3-9dcb-c073d249b1ea',type:'draft.generated' as const,provider:'cloudflare' as const,pageCount:4};let calls=0;
 const options={env:{ACTIVEPIECES_WEBHOOK_URL:'https://pieces.example/api/v1/webhooks/test',ACTIVEPIECES_WEBHOOK_TOKEN:'private'},fetcher:async(_url:unknown,init?:RequestInit)=>{calls++;const payload=JSON.parse(String(init?.body));assert.deepEqual(Object.keys(payload).sort(),['id','pageCount','provider','requiresReview','type','version']);assert.equal(payload.requiresReview,true);return new Response(null,{status:202})}};
 assert.equal(await notifyGeneration(event,options),'accepted');
 assert.equal(await notifyGeneration({...event,html:'private'} as typeof event,options),'unavailable');assert.equal(calls,1);
 assert.equal(await notifyGeneration(event,{...options,fetcher:async()=>{throw Error('offline')}}),'unavailable');
});
