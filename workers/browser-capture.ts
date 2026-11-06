/** Optional browser capture worker. Run separately from the Next.js frontend.
 * Requires a permitted Playwright Chromium installation in the worker environment.
 * The worker accepts only explicitly allowlisted public HTTPS hosts.
 */
import {chromium} from 'playwright';
import type {BrowserEvidence} from '../src/lib/browser-evidence';

async function capture(urlText:string):Promise<BrowserEvidence>{
 const url=new URL(urlText);
 const allowed=(process.env.FORGE_CAPTURE_HOSTS||'').split(',').map(host=>host.trim().toLowerCase()).filter(Boolean);
 if(url.protocol!=='https:'||!allowed.includes(url.hostname.toLowerCase())||url.username||url.password||url.port&&url.port!=='443')throw Error('Host is not explicitly allowed for capture');
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const requestUrl=new URL(route.request().url());
   if(requestUrl.protocol!=='https:'||!allowed.includes(requestUrl.hostname.toLowerCase()))return route.abort();
   return route.continue();
  });
  const page=await context.newPage();
  await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:15000});
  const title=await page.title();
  const landmarks=await page.locator('h1,h2,nav,main').evaluateAll(nodes=>nodes.slice(0,30).map(node=>({role:node.tagName.toLowerCase(),text:(node.textContent||'').trim().slice(0,120)})));
  const interactions=await page.locator('a,button,input,form').evaluateAll(nodes=>nodes.slice(0,80).map(node=>({kind:node.tagName.toLowerCase()==='a'?'link':node.tagName.toLowerCase()==='form'?'form':node.tagName.toLowerCase()==='input'?'search':'button',label:(node.getAttribute('aria-label')||node.textContent||'').trim().slice(0,100),verified:false})));
  return {version:1,sourceUrl:url.origin,capturedAt:new Date().toISOString(),viewport:{width:1280,height:800},pages:[{path:url.pathname,title,landmarks,interactions}],warnings:['Interactions discovered but not executed; screenshot storage not configured']};
 }finally{await browser.close()}
}
capture(process.argv[2]||'').then(evidence=>process.stdout.write(JSON.stringify(evidence)+'\n')).catch(error=>{process.stderr.write(String(error)+'\n');process.exitCode=1});
