import {PlaywrightCrawler,Configuration} from 'crawlee';
import {chromium} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {publicSiteUrl} from '../../src/lib/server/public-site-fetch';
import {publicResearchPolicy} from '../../src/lib/server/public-site-policy';
import {assertPublicDns} from '../public-network-policy.mjs';
import {isSafeNavigationProbe} from '../navigation-probe-policy.mjs';
import {validateBrowserEvidence,type BrowserEvidence} from '../../src/lib/browser-evidence';
/** Crawlee schedules permitted, same-origin pages; existing DNS/robots policies remain authoritative. */
export async function captureWithCrawlee(source:string,hosts:string[]){
 const target=publicSiteUrl(source);if(!hosts.includes(target.hostname)||!isSafeNavigationProbe(target.href,target.origin))throw Error('Capture source is not authorized');
 await Promise.all(hosts.map(assertPublicDns));
 const beforeRequest=publicResearchPolicy();await beforeRequest(target);
 const pages:BrowserEvidence['pages']=[],warnings:string[]=[];const seen=new Set<string>();
 const crawler=new PlaywrightCrawler({
  launchContext:{launcher:chromium,launchOptions:{headless:true}},browserPoolOptions:{useFingerprints:false},
  maxRequestsPerCrawl:4,maxConcurrency:1,maxRequestsPerMinute:12,sameDomainDelaySecs:2,maxRequestRetries:0,maxSessionRotations:0,
  useSessionPool:false,navigationTimeoutSecs:15,requestHandlerTimeoutSecs:20,
  preNavigationHooks:[async({page,request})=>{
   const url=publicSiteUrl(request.url);if(url.origin!==target.origin||!isSafeNavigationProbe(url.href,target.origin))throw Error('Unsafe capture destination');await beforeRequest(url);
   await page.context().clearCookies();await page.setViewportSize({width:1280,height:800});
   await page.context().route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.protocol!=='https:'||url.port||url.username||url.password||!hosts.includes(url.hostname)||!['GET','HEAD'].includes(route.request().method()))return route.abort();
    if(route.request().isNavigationRequest()&&(!isSafeNavigationProbe(url.href,target.origin)||url.origin!==target.origin))return route.abort();
    try{await assertPublicDns(url.hostname)}catch{return route.abort()}
    return route.continue();
   });
   page.on('dialog',dialog=>void dialog.dismiss());
  }],
  requestHandler:async({page,response,addRequests})=>{
   if(!response?.ok()||new URL(page.url()).origin!==target.origin)throw Error('Capture failed or redirected outside authorized origin');
   const observed=await page.evaluate(()=>{
    const clean=(value:string|null)=>String(value||'').trim().replace(/\s+/g,' ');
    const body=getComputedStyle(document.body),heading=document.querySelector('h1,h2'),h=heading?getComputedStyle(heading):body;
    const links=[...document.querySelectorAll('a[href]')].slice(0,80).map(n=>({kind:'link' as const,label:clean(n.textContent).slice(0,200),target:(n.getAttribute('href')||'').slice(0,500),verified:false}));
    return {title:document.title.slice(0,500),landmarks:[...document.querySelectorAll('h1,h2,nav,main')].slice(0,40).map(n=>({role:n.tagName.toLowerCase(),text:clean(n.textContent).slice(0,500)})),interactions:links,designTokens:{backgroundColor:body.backgroundColor,textColor:body.color,fontFamily:body.fontFamily,headingFontFamily:h.fontFamily,headingFontSize:h.fontSize,baseFontSize:body.fontSize}};
   });
   const path=new URL(page.url()).pathname+new URL(page.url()).search;pages.push({path,...observed});seen.add(path);
   const urls=observed.interactions.flatMap(link=>{try{const url=new URL(link.target,page.url());return isSafeNavigationProbe(url.href,target.origin)&&!seen.has(url.pathname+url.search)&&url.origin===target.origin&&!/\.(?:pdf|zip|png|jpe?g|webp|svg)$/i.test(url.pathname)?[{url:url.href}]:[]}catch{return []}}).slice(0,3);
   await addRequests(urls);
  },failedRequestHandler:async()=>{warnings.push('An authorized page could not be captured; no retries or access bypass attempted.')}
 },new Configuration({persistStorage:false,defaultRequestQueueId:randomUUID()}));
 await crawler.run([{url:target.href}]);
 const evidence={version:1 as const,sourceUrl:target.origin,capturedAt:new Date().toISOString(),viewport:{width:1280,height:800},pages,warnings};
 if(!pages.length||!validateBrowserEvidence(evidence))throw Error('No valid browser capture was collected');
 return evidence;
}
