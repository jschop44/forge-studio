#!/usr/bin/env node
// End-to-end production check; never treats model readiness as generation success.
// Usage: FORGE_BASE_URL=https://your-deployment.example npm run smoke:ai
const base=process.env.FORGE_BASE_URL;
if(!base)throw Error('Set FORGE_BASE_URL to the deployed Forge Studio origin');
const origin=new URL(base);
if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password)throw Error('Invalid deployment origin');
const status=await fetch(new URL('/api/ai/status',origin),{signal:AbortSignal.timeout(15000),cache:'no-store'});
const readiness=await status.json();
console.log('Model readiness:',JSON.stringify(readiness));
if(!status.ok||!readiness.ready)throw Error('Configured local model is not ready; generation was not attempted');
const input={
 businessName:'Forge Verification Studio',
 industry:'Design',
 description:'A small independent studio that designs accessible websites for local businesses.',
 services:['Website design','Accessibility review']
};
const response=await fetch(new URL('/api/ai/business',origin),{
 method:'POST',
 headers:{'Content-Type':'application/json','Origin':origin.origin},
 body:JSON.stringify(input),
 signal:AbortSignal.timeout(90000)
});
if(!response.ok)throw Error('Generation failed with HTTP '+response.status+': '+(await response.text()).slice(0,300));
const result=await response.json();
if(result.provider!=='ollama'||result.draft?.businessName!==input.businessName||!Array.isArray(result.pages))throw Error('Invalid generated site response');
if(typeof result.draft?.description!=='string'||result.draft.description.trim().length<15)throw Error('Model did not generate a valid description');
if(result.draft.industry!==input.industry)throw Error('AI changed verified business industry');
if(JSON.stringify(result.draft.services)!==JSON.stringify(input.services))throw Error('AI changed verified business services');
if(!result.draft.description.trim())throw Error('AI generated empty marketing copy');
const design=result.draft.design;
if(!design||!['editorial','image-led'].includes(design.layout)||!['sand','mint','sky'].includes(design.palette))throw Error('Model composition is missing or invalid');
const pages=new Map(result.pages.map(page=>[page.slug,page]));
if(result.pages.length!==4||pages.size!==4)throw Error('Expected exactly four distinct generated pages');
for(const slug of ['index','services','about','contact']){
 const page=pages.get(slug);
 if(!page||typeof page.html!=='string'||!page.html.includes('<html')||!page.html.includes('</html>'))throw Error('Missing valid '+slug+' page');
 if(!page.html.includes('data-forge-layout="'+design.layout+'"'))throw Error('Model layout not rendered on '+slug+' page');
 if(!page.html.includes('data-forge-experience="standard"'))throw Error('Generation must retain the Standard default on '+slug+' page');
 if(!page.html.includes('prefers-reduced-motion'))throw Error('Missing reduced-motion styling on '+slug+' page');
}
const accent={sand:'#e3c89e',mint:'#9ee3bf',sky:'#9ed8f5'}[design.palette];
if(!pages.get('index').html.includes(accent))throw Error('Model palette not rendered');
console.log('PASS: real Ollama generated four pages with validated model-selected composition.');
console.log('Browser behavior, spatial controls and responsive layouts are verified separately by the Chromium suite.');
