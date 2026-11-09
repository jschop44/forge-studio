import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBusinessRecognition,literalBusinessActivity} from '../src/lib/business-recognition';
import {recognizeBusinessWithLocalAi,localAiCapacity} from '../src/lib/server/local-ai';
import {analyzeSiteEvidence} from '../src/lib/forge-intelligence';
import {inferBusinessIndustry} from '../src/lib/website-experience';
import {findBusinessPanorama} from '../src/lib/environment-catalog';
import {businessArtDirection} from '../src/lib/business-art-direction';
const niches=[['Horology workshop','We restore antique clocks and repair mechanical watches.'],['Marine electronics','We install navigation electronics on sailboats.'],['Microfluidic laboratory','We design and manufacture microfluidic chips for research.'],['Art conservation','We conserve historic paintings and paper artworks.'],['Piano tuning','We tune and restore acoustic pianos.'],['Tea shop','We sell loose leaf tea and tea accessories.'],['Custom orthotics','We fabricate custom orthotic devices.'],['Industrial filtration','We manufacture filtration systems for industrial water.']];
test('recognition accepts grounded niches outside every built-in category',()=>{
 for(const [industry,brief] of niches){const input={businessName:'Northstar',brief};assert.equal(parseBusinessRecognition({status:'identified',industry,services:[],evidence:[brief]},input).industry,industry)}
 assert.throws(()=>parseBusinessRecognition({status:'identified',industry:'Luxury hotels',services:[],evidence:['luxury hotel']},{businessName:'Northstar',brief:'We restore antique clocks.'}),/grounded/);
 assert.deepEqual(parseBusinessRecognition({status:'needs-context',industry:'Unclear',services:[],evidence:[]},{businessName:'Soccet',brief:''}),{status:'needs-context',industry:'Unclear',services:[],evidence:[]});
 assert.equal(literalBusinessActivity('We restore antique clocks and repair mechanical watches.'),'We restore antique clocks and repair mechanical watches');
});
test('the free recognition provider uses an open vocabulary and validates evidence',async()=>{
 const previous=globalThis.fetch,url=process.env.OLLAMA_URL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';
  globalThis.fetch=async(input,options)=>{assert.equal(new URL(String(input)).hostname,'127.0.0.1');const request=JSON.parse(String(options?.body));assert.equal(request.format.properties.industry.enum,undefined);assert.equal(options?.redirect,'error');return new Response(JSON.stringify({response:JSON.stringify({status:'identified',industry:niches[0][0],services:[],evidence:[niches[0][1]]})}))};
  const result=await recognizeBusinessWithLocalAi({businessName:'Northstar',brief:niches[0][1]});assert.equal(result.industry,'Horology workshop');assert.equal(result.provider,'ollama');assert.equal(localAiCapacity().active,0);
 }finally{globalThis.fetch=previous;if(url===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=url}
});
test('medical, animal care and hospitality cannot be conflated',()=>{
 assert.equal(inferBusinessIndustry('Northside Hospital',''),'Healthcare and medical services');
 assert.equal(inferBusinessIndustry('Northside Animal Hospital',''),'Pet and animal care');
 assert.equal(analyzeSiteEvidence({url:'https://example.com',title:'Northside Animal Hospital',description:'Veterinary and animal care',headings:['Veterinary care']}).industry,'Pet and animal care');
 assert.equal(businessArtDirection('Hospital','Northside').key,'clinical');
 assert.equal(businessArtDirection('Hotel and hospitality','Northside').key,'hospitality');
});
test('panorama discovery searches subject evidence and rejects incidental or mismatched themes',()=>{
 assert.match(findBusinessPanorama('Healthcare and medical services')!.source,/hospital_room_2/);
 assert.match(findBusinessPanorama('Restaurant and hospitality')!.source,/restaurant/);
 assert.match(findBusinessPanorama('Museum')!.source,/museum/);
 assert.equal(findBusinessPanorama('Clock restoration'),null);
 assert.equal(findBusinessPanorama('Art museum')?.source.includes('aviation_museum')||false,false);
 assert.equal(findBusinessPanorama('Carpet cleaning'),null);
});

test('unsupported service claims are discarded while supported paraphrases remain',()=>{
 const input={businessName:'Meridian',brief:'We restore antique clocks and repair mechanical watches.'};
 const result=parseBusinessRecognition({status:'identified',industry:'Horology workshop',services:['Clock restoration','Watch repair','Same day delivery','Heart surgery'],evidence:[input.brief]},input);
 assert.deepEqual(result.services,['Clock restoration','Watch repair']);
});
