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
    // Computed, bounded measurements only: never copy stylesheets or scripts.
    const main=document.querySelector('main'),hero=heading?.closest('section,[class*="hero"]');
    const heroStyle=hero?getComputedStyle(hero):null,nav=document.querySelector('body>nav,body>header,header');
    const navStyle=nav?getComputedStyle(nav):null,cta=document.querySelector('main a.button,main [role="button"],main button');
    const ctaStyle=cta?getComputedStyle(cta):null,mainWidth=main?Math.round(main.getBoundingClientRect().width):0;
    const tracks=(heroStyle?.gridTemplateColumns||'').split(' ').filter(value=>value.endsWith('px'));
    const alignment=heading?getComputedStyle(heading).textAlign:'';
    // Capture inert measurements only. Unsupported units and large overlays are
    // omitted instead of copying source CSS or guessing mobile geometry.
    const boundedPx=(value:string|undefined,max:number)=>{
      if(!value||!/^\\d{1,4}(?:\\.\\d{1,3})?px$/.test(value))return;
      const number=Math.round(Number.parseFloat(value));
      return number>=0&&number<=max?number+'px':undefined;
    };
    const heroImage=hero?.querySelector('picture img,img');
    const mediaRadius=heroImage?getComputedStyle(heroImage).borderTopLeftRadius:undefined;
    const layoutTokens={
      ...(['left','center','right'].includes(alignment)?{heroTextAlign:alignment as 'left'|'center'|'right'}:{}),
      ...(heroStyle?.display==='grid'&&tracks.length>0?{heroLayout:tracks.length>=2?'split' as const:'stacked' as const}:heroStyle?.display==='flex'?{heroLayout:heroStyle.flexDirection.startsWith('column')?'stacked' as const:'split' as const}:{}),
      ...(mainWidth>=320&&mainWidth<=1800?{contentMaxWidth:mainWidth+'px'}:{}),
      ...(boundedPx(navStyle?.paddingTop,96)?{headerPaddingTop:boundedPx(navStyle?.paddingTop,96)}:{}),
      ...(boundedPx(navStyle?.paddingBottom,96)?{headerPaddingBottom:boundedPx(navStyle?.paddingBottom,96)}:{}),
      ...(boundedPx(heroStyle?.columnGap,120)?{heroGap:boundedPx(heroStyle?.columnGap,120)}:{}),
      ...(boundedPx(heroStyle?.paddingTop,240)?{heroPaddingTop:boundedPx(heroStyle?.paddingTop,240)}:{}),
      ...(boundedPx(heroStyle?.paddingBottom,240)?{heroPaddingBottom:boundedPx(heroStyle?.paddingBottom,240)}:{}),
      ...(boundedPx(mediaRadius,64)?{heroMediaRadius:boundedPx(mediaRadius,64)}:{}),
      ...(ctaStyle?{buttonRadius:Math.min(64,Math.max(0,Number.parseFloat(ctaStyle.borderTopLeftRadius)||0))+'px'}:{}),
      ...(ctaStyle&&(ctaStyle.backgroundColor.startsWith('rgb(')||ctaStyle.backgroundColor.startsWith('rgba(')||ctaStyle.backgroundColor.startsWith('#'))?{buttonBackgroundColor:ctaStyle.backgroundColor}:{}),
      ...(ctaStyle&&(ctaStyle.color.startsWith('rgb(')||ctaStyle.color.startsWith('rgba(')||ctaStyle.color.startsWith('#'))?{buttonTextColor:ctaStyle.color}:{}),
      ...(navStyle&&(navStyle.backgroundColor.startsWith('rgb(')||navStyle.backgroundColor.startsWith('rgba(')||navStyle.backgroundColor.startsWith('#'))?{headerBackgroundColor:navStyle.backgroundColor}:{})
    };
    const links=[...document.querySelectorAll('a[href]')].slice(0,80).map(n=>({kind:'link' as const,label:clean(n.textContent).slice(0,200),target:(n.getAttribute('href')||'').slice(0,500),verified:false}));
    return {title:document.title.slice(0,500),landmarks:[...document.querySelectorAll('h1,h2,nav,main')].slice(0,40).map(n=>({role:n.tagName.toLowerCase(),text:clean(n.textContent).slice(0,500)})),interactions:links,designTokens:{backgroundColor:body.backgroundColor,textColor:body.color,fontFamily:body.fontFamily,headingFontFamily:h.fontFamily,headingFontSize:h.fontSize,baseFontSize:body.fontSize,...layoutTokens}};
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
