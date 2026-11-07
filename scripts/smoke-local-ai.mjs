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
const pages=new Map(result.pages.map(page=>[page.slug,page]));
for(const slug of ['index','services','about','contact']){
 const page=pages.get(slug);
 if(!page||typeof page.html!=='string'||!page.html.includes('<html')||!page.html.includes('</html>'))throw Error('Missing valid '+slug+' page');
 if(!page.html.includes('forge-home-webgl-controller')&&!page.html.includes('forge-spatial-controller'))throw Error('Missing immersive WebGL controller on '+slug+' page');
 if(!page.html.includes("getContext('webgl'"))throw Error('Missing WebGL initialization on '+slug+' page');
 if(!page.html.includes('prefers-reduced-motion'))throw Error('Missing reduced-motion safeguard on '+slug+' page');
 if(!page.html.includes("event.pointerType==='touch'"))throw Error('Missing touch orbit input on '+slug+' page');
 if(!page.html.includes("event.key==='w'"))throw Error('Missing keyboard orbit input on '+slug+' page');
 if(!page.html.includes("event.key==='q'")||!page.html.includes("event.key==='e'")||!page.html.includes("gl.uniform1f(travelUniform,travel)"))throw Error('Missing camera depth controls on '+slug+' page');
 if(!page.html.includes("addEventListener('touchmove'")||!page.html.includes("addEventListener('wheel'"))throw Error('Missing touch pinch or wheel depth controls on '+slug+' page');
 if(!page.html.includes("gl.uniform2f(walkUniform,walkX,walkY)")||!page.html.includes('floorCoords'))throw Error('Missing navigable perspective ground plane on '+slug+' page');
 if(!page.html.includes('beaconPosition')||!page.html.includes('gl.uniform2f(beaconUniform,beaconX,beaconY)'))throw Error('Missing world-anchored navigation beacon on '+slug+' page');
 if(!page.html.includes("beaconLink.href='services.html'")||!page.html.includes("beaconLink.setAttribute('aria-label'"))throw Error('Missing accessible interactive beacon navigation on '+slug+' page');
 for(const destination of ['about.html','contact.html'])if(!page.html.includes("href:'"+destination+"'"))throw Error('Missing spatial navigation portal '+destination+' on '+slug+' page');
 if(!page.html.includes('portal.link.hidden=!visible'))throw Error('Spatial portals must respond to camera translation on '+slug+' page');
}
console.log('PASS: production Ollama generated and returned all four website pages.');
