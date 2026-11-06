// Optional worker; install Playwright in a separate authorized capture environment.
// Example: FORGE_CAPTURE_HOSTS=example.com node workers/browser-capture.mjs https://example.com
import { chromium } from 'playwright';
const target=new URL(process.argv[2]);
const hosts=(process.env.FORGE_CAPTURE_HOSTS||'').split(',').map(x=>x.trim());
if(target.protocol!=='https:'||!hosts.includes(target.hostname)||target.port||target.username||target.password)throw Error('Host not allowlisted');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  return url.protocol==='https:'&&hosts.includes(url.hostname)?route.continue():route.abort();
 });
 const page=await context.newPage();
 await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:15000});
 await page.screenshot({path:'browser-screenshot.png',fullPage:true,animations:'disabled'});
 const landmarks=await page.locator('h1,h2,nav,main').evaluateAll(nodes=>nodes.slice(0,30).map(n=>({role:n.tagName.toLowerCase(),text:(n.textContent||'').trim().slice(0,120)})));
 const visualRegions=await page.locator('header,nav,main,footer,h1,section').evaluateAll(nodes=>nodes.slice(0,100).map(n=>{
  const r=n.getBoundingClientRect();
  const role=n.tagName.toLowerCase()==='h1'?'hero':n.tagName.toLowerCase()==='section'?'section':n.tagName.toLowerCase();
  return {role,x:Math.max(0,r.left),y:Math.max(0,r.top),width:Math.max(0,Math.min(r.width,window.innerWidth-Math.max(0,r.left))),height:Math.max(0,Math.min(r.height,window.innerHeight-Math.max(0,r.top))),text:(n.textContent||'').trim().slice(0,200)};
 }).filter(r=>r.width>0&&r.height>0&&r.x<window.innerWidth&&r.y<window.innerHeight)));
 const interactions=await page.locator('a,button,form').evaluateAll(nodes=>nodes.slice(0,80).map(n=>({kind:n.tagName.toLowerCase()==='a'?'link':n.tagName.toLowerCase()==='form'?'form':'button',label:(n.getAttribute('aria-label')||n.textContent||'').trim().slice(0,100),target:n.tagName.toLowerCase()==='a'?(n.getAttribute('href')||'').slice(0,300):undefined,verified:false})));
 process.stdout.write(JSON.stringify({version:1,sourceUrl:target.origin,capturedAt:new Date().toISOString(),viewport:{width:1280,height:800},pages:[{path:target.pathname,title:await page.title(),screenshotUrl:'browser-screenshot.png',landmarks,interactions,visualRegions}],warnings:['Interactions not executed; screenshot saved separately as browser-screenshot.png']})+'\n');
}finally{await browser.close()}
