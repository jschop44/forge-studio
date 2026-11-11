import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {enhanceImmersiveWorld,worldTheme} from '../src/lib/immersive-world';
import {auditGeneratedDraft} from '../src/lib/draft-quality-gate';
import {createExtractedPages} from '../src/lib/extracted-pages';
const brief={businessName:'Harbor Coffee',industry:'Coffee shop',description:'An independent cafe offering coffee beans and community workshops.',services:['Coffee beans','Community workshops'],experienceStyle:'immersive'};
test('full immersion combines business-specific object navigation with page-wide worlds and passes the draft gate',()=>{
 const site=generateBusinessWebsite(brief);
 for(const page of site.pages){
  assert.match(page.html,/forge-immersive-world-controller/);assert.match(page.html,/data-world-theme="coffee"/);
  for(const target of site.pages)assert.ok(page.html.includes('data-world-page="'+target.slug+'"'));
  assert.ok(page.html.includes('forge-object-navigation-controller'));assert.ok(!page.html.includes('forge-cinematic-controller'));
  for(const [tag,source] of page.html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(!tag.includes('application/ld+json'))assert.doesNotThrow(()=>new Script(source));
 }
 const audit=auditGeneratedDraft(site.pages);assert.equal(audit.readyForReview,true,audit.errors.join('; '));
 assert.equal(audit.readyForPublishing,false);
});
test('world scenery uses the explicit business niche without reclassifying incidental offerings',()=>{
 for(const [industry,theme] of [['Coffee shop','coffee'],['Baseball store','baseball'],['Restaurant','dining'],['Real estate','property'],['Hair salon','wellness'],['Software','technology'],['Accounting','gallery']])assert.equal(worldTheme(industry),theme);
 const site=generateBusinessWebsite({...brief,businessName:'Baseball Supply',industry:'Baseball store',services:['Baseball bats','Coffee at concessions']});
 for(const page of site.pages){assert.match(page.html,/data-world-theme="baseball"/);assert.ok(!page.html.includes('data-world-theme="coffee"'))}
});
test('extracted destinations are added to the shared world once on every page',()=>{
 const pages=generateBusinessWebsite(brief).pages;
 const extras=createExtractedPages({url:'https://example.com',title:'Harbor',description:'Coffee',headings:[],pageSummaries:[{path:'/events',label:'Events',title:'Community events',description:'Meet the team',headings:['Events']}]},brief.businessName);
 const enhanced=enhanceImmersiveWorld([...pages,...extras],brief),again=enhanceImmersiveWorld(enhanced,brief);
 assert.deepEqual(again,enhanced);
 for(const page of enhanced){assert.equal((page.html.match(/id="forge-immersive-world-controller"/g)||[]).length,1);assert.match(page.html,/data-world-page="events"/)}
});

test('the AI business endpoint retains full immersion through free model inference and rendering',async()=>{
 const {POST}=await import('../src/app/api/ai/business/route');
 const {NextRequest}=await import('next/server');
 const original=globalThis.fetch,previous=process.env.OLLAMA_URL;
 try{
  process.env.OLLAMA_URL='http://127.0.0.1:11434';
  globalThis.fetch=async(input)=>{assert.equal(new URL(String(input)).hostname,'127.0.0.1');return new Response(JSON.stringify({response:JSON.stringify({description:brief.description,design:{layout:'editorial',palette:'sand'}})}))};
  const result=await POST(new NextRequest('http://localhost/api/ai/business',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(brief)}));
  assert.equal(result.status,200);
  const payload=await result.json();assert.equal(payload.provider,'ollama');
  for(const page of payload.pages)assert.match(page.html,/forge-immersive-world-controller/);
 }finally{globalThis.fetch=original;if(previous===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=previous}
});
