// Optional worker; install Playwright in a separate authorized capture environment.
// Example: FORGE_CAPTURE_HOSTS=example.com node workers/browser-capture.mjs https://example.com
import { chromium } from 'playwright';
import { isIP } from 'node:net';
import { isSafeNavigationProbe } from './navigation-probe-policy.mjs';
import { assertPublicDns } from './public-network-policy.mjs';
const unsafeHost=host=>isIP(host.replace(/^\\[|\\]$/g,''))!==0||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.test');
const target=new URL(process.argv[2]);
const hosts=(process.env.FORGE_CAPTURE_HOSTS||'').split(',').map(x=>x.trim());
if(target.protocol!=='https:'||!hosts.includes(target.hostname)||unsafeHost(target.hostname)||target.port||target.username||target.password)throw Error('Host not allowlisted');
await Promise.all(hosts.filter(Boolean).map(assertPublicDns));
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:false,permissions:[]});
 context.setDefaultTimeout(8000);
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  const allowed=url.protocol==='https:'&&hosts.includes(url.hostname)&&!unsafeHost(url.hostname)&&!url.port&&!url.username&&!url.password;
  const method=route.request().method();
  // Captures must never submit mutations, even if a page script attempts them.
  if(!allowed||(method!=='GET'&&method!=='HEAD'))return route.abort();
  // Recheck each requested host immediately before allowing the request.
  // This reduces DNS-rebinding exposure but does not replace network egress isolation.
  try{await assertPublicDns(url.hostname);}catch{return route.abort();}
  return route.continue();
 });
 const page=await context.newPage();
 page.on('dialog',dialog=>void dialog.dismiss());
 await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:15000});
 await page.screenshot({path:'browser-screenshot.png',fullPage:true,animations:'disabled'});
 const landmarks=await page.locator('h1,h2,nav,main').evaluateAll(nodes=>nodes.slice(0,30).map(n=>({role:n.tagName.toLowerCase(),text:(n.textContent||'').trim().slice(0,120)})));
 const visualRegions=await page.locator('header,nav,main,footer,h1,section').evaluateAll(nodes=>nodes.slice(0,100).map(n=>{
  const r=n.getBoundingClientRect();
  const role=n.tagName.toLowerCase()==='h1'?'hero':n.tagName.toLowerCase()==='section'?'section':n.tagName.toLowerCase();
  return {role,x:Math.max(0,r.left),y:Math.max(0,r.top),width:Math.max(0,Math.min(r.width,window.innerWidth-Math.max(0,r.left))),height:Math.max(0,Math.min(r.height,window.innerHeight-Math.max(0,r.top))),text:(n.textContent||'').trim().slice(0,200)};
 }).filter(r=>r.width>0&&r.height>0&&r.x<window.innerWidth&&r.y<window.innerHeight));
 if(!visualRegions.length){
  const bodyRegion=await page.locator('body').evaluate(n=>{
   const r=n.getBoundingClientRect();
   return {role:'main',x:Math.max(0,r.left),y:Math.max(0,r.top),width:Math.max(0,Math.min(r.width,window.innerWidth-Math.max(0,r.left))),height:Math.max(0,Math.min(r.height,window.innerHeight-Math.max(0,r.top)))};
  });
  if(bodyRegion.width>0&&bodyRegion.height>0)visualRegions.push(bodyRegion);
 }
 const designTokens=await page.evaluate(()=>{const body=getComputedStyle(document.body);const heading=document.querySelector('h1,h2');const h=heading?getComputedStyle(heading):body;return {backgroundColor:body.backgroundColor,textColor:body.color,fontFamily:body.fontFamily,headingFontFamily:h.fontFamily,headingFontSize:h.fontSize,baseFontSize:body.fontSize}});
 const interactions=await page.locator('a,button,form').evaluateAll(nodes=>nodes.slice(0,80).map(n=>({kind:n.tagName.toLowerCase()==='a'?'link':n.tagName.toLowerCase()==='form'?'form':'button',label:(n.getAttribute('aria-label')||n.textContent||'').trim().slice(0,100),target:n.tagName.toLowerCase()==='a'?(n.getAttribute('href')||'').slice(0,300):undefined,verified:false})));
 const navigationChecks=[];
 const additionalPages=[];
 const seenPaths=new Set();
 for(const item of interactions){
  if(item.kind!=='link'||!item.target||navigationChecks.length>=8)continue;
  let url;
  try{url=new URL(item.target,page.url());}catch{continue;}
  if(!isSafeNavigationProbe(url.href,target.origin)||url.pathname===new URL(page.url()).pathname&&url.search===new URL(page.url()).search||seenPaths.has(url.pathname+url.search))continue;
  seenPaths.add(url.pathname+url.search);
  // A separate isolated page verifies read-only navigation; no forms or buttons are executed.
  const probe=await context.newPage();
  probe.on('dialog',dialog=>void dialog.dismiss());
  try{
   const response=await probe.goto(url.href,{waitUntil:'domcontentloaded',timeout:8000});
   navigationChecks.push({path:url.pathname+url.search,status:response?.status()??null,ok:Boolean(response?.ok()),verifiedBy:'navigation-get'});
   if(response?.ok()&&additionalPages.length<3){
    const snapshot=await probe.evaluate(()=>{
     const regions=[...document.querySelectorAll('header,nav,main,footer,h1,section')].slice(0,100).map(n=>{const r=n.getBoundingClientRect();return {role:n.tagName.toLowerCase()==='h1'?'hero':n.tagName.toLowerCase(),x:Math.max(0,r.left),y:Math.max(0,r.top),width:Math.max(0,Math.min(r.width,innerWidth-Math.max(0,r.left))),height:Math.max(0,Math.min(r.height,innerHeight-Math.max(0,r.top))),text:(n.textContent||'').trim().slice(0,200)}}).filter(r=>r.width>0&&r.height>0);
     const body=getComputedStyle(document.body);const heading=document.querySelector('h1,h2');const h=heading?getComputedStyle(heading):body;
     const links=[...document.querySelectorAll('a')].slice(0,30).map(n=>({kind:'link',label:(n.getAttribute('aria-label')||n.textContent||'').trim().slice(0,100),target:(n.getAttribute('href')||'').slice(0,300),verified:false}));
     return {title:document.title,visualRegions:regions,designTokens:{backgroundColor:body.backgroundColor,textColor:body.color,fontFamily:body.fontFamily,headingFontFamily:h.fontFamily,headingFontSize:h.fontSize,baseFontSize:body.fontSize},interactions:links,landmarks:[...document.querySelectorAll('h1,h2')].slice(0,30).map(n=>({role:n.tagName.toLowerCase(),text:(n.textContent||'').trim().slice(0,120)}))};
    });
    additionalPages.push({path:url.pathname,title:snapshot.title,...snapshot,navigationChecks:[]});
   }
  }catch{
   navigationChecks.push({path:url.pathname+url.search,status:null,ok:false,verifiedBy:'navigation-get'});
  }finally{await probe.close();}
 }
 const interactionSummary={observed:interactions.length,links:interactions.filter(i=>i.kind==='link').length,buttons:interactions.filter(i=>i.kind==='button').length,forms:interactions.filter(i=>i.kind==='form').length,unlabeledControls:interactions.filter(i=>!i.label).length,linksWithoutTargets:interactions.filter(i=>i.kind==='link'&&!i.target).length,interactionsExecuted:false};
 process.stdout.write(JSON.stringify({version:1,sourceUrl:target.origin,capturedAt:new Date().toISOString(),viewport:{width:1280,height:800},pages:[{path:target.pathname,title:await page.title(),screenshotUrl:'browser-screenshot.png',landmarks,designTokens,interactions,interactionSummary,navigationChecks,visualRegions},...additionalPages],warnings:['Links probed with read-only GET navigation; forms and buttons not executed; screenshot saved separately as browser-screenshot.png']})+'\n');
}finally{await browser.close()}
