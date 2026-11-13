import {chromium} from '@playwright/test';
import {unzipSync,strFromU8} from 'fflate';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,posix} from 'node:path';
import {inspectExportedBranding,inspectExportedPhotoCoverage} from './exported-visual-acceptance.mjs';

const BASE='https://forge-studio-preview.stands-old-3h.workers.dev';
const OUT='acceptance-evidence';
const cases=[
 {business:'Best Buy',url:'bestbuy.com',mode:'inspired'},
 {business:'Best Buy',url:'bestbuy.com',mode:'redesign'},
 {business:'Disney',url:'disney.com',mode:'inspired'},
 {business:'Disney',url:'disney.com',mode:'redesign'}
];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForRevision(sha){
 if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Missing exact verified source revision');
 for(let attempt=0;attempt<50;attempt++){
  try{
   const response=await fetch(BASE+'/api/health?acceptance='+attempt,{signal:AbortSignal.timeout(9000),cache:'no-store'});
   const value=await response.json();
   if(response.ok&&value.ok===true&&value.service==='forge-studio'&&value.revision===sha)return;
  }catch{}
  await pause(8000);
 }
 throw Error('The intended Forge revision was not verified live within the bounded wait');
}
function zipGraph(bytes){
 const entries=unzipSync(bytes);
 const pages=Object.fromEntries(Object.entries(entries).filter(([name])=>/\.html$/i.test(name)).map(([name,data])=>[name,strFromU8(data)]));
 const names=Object.keys(pages),edges=new Map(),broken=[];
 for(const [name,html] of Object.entries(pages)){
  const outgoing=[];
  for(const match of html.matchAll(/href=["']([^"']+)["']/gi)){
   const raw=match[1];
   if(/^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(raw))continue;
   if(/^javascript:/i.test(raw)){broken.push(name+': unsafe link');continue}
   const [pathPart,fragment='']=raw.split('#');
   const path=pathPart.split('?')[0];
   if(path.startsWith('/')){broken.push(name+': absolute internal link '+path);continue}
   const target=path?posix.normalize(posix.join(posix.dirname(name),path)):name;
   if(target.endsWith('.html')){
    if(!pages[target])broken.push(name+': missing '+target);
    else outgoing.push(target);
   }
   if(fragment&&pages[target]&&!pages[target].includes('id="'+fragment+'"')&&!pages[target].includes("id='"+fragment+"'")){
    broken.push(name+': missing anchor '+target+'#'+fragment);
   }
  }
  edges.set(name,outgoing);
 }
 const reached=new Set(),queue=['index.html'];
 while(queue.length){const name=queue.shift();if(reached.has(name)||!pages[name])continue;reached.add(name);queue.push(...(edges.get(name)||[]))}
 return {pages:names,unreachable:names.filter(name=>!reached.has(name)),brokenLinks:broken.slice(0,50),allPagesReachable:reached.size===names.length&&names.length>0};
}

async function inspectPortableExport(browser,archive,index,entry){
 const entries=unzipSync(archive),files=new Map(Object.entries(entries).filter(([name])=>name.endsWith('.html')).map(([name,data])=>[name,strFromU8(data)]));
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();
 await page.route('https://forge-export.test/**',route=>{
  const key=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/,'')||'index.html';
  return route.fulfill({status:files.has(key)?200:404,contentType:'text/html; charset=utf-8',body:files.get(key)||'Not in exported ZIP'});
 });
 const measurements=[];
 try{
  for(const [width,device] of [[1280,'desktop'],[390,'390px']]){
   await page.setViewportSize({width,height:900});
   await page.goto('https://forge-export.test/index.html',{waitUntil:'domcontentloaded',timeout:15000});
   // Do not conflate lazy images outside the viewport with missing assets.
   await page.waitForTimeout(1500);
   const finding=await page.evaluate(()=>{
    const images=[...document.images];
    const headings=[...document.querySelectorAll('h1,h2,h3')];
    return {
     documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
     scrollHeight:document.documentElement.scrollHeight,
     headingsClipped:headings.filter(h=>h.scrollWidth>h.clientWidth+2&&h.clientWidth>0).slice(0,8).map(h=>h.textContent?.trim().slice(0,80)),
     nonStandardTransforms:headings.filter(h=>{
      const t=getComputedStyle(h).transform;return t&&t!=='none'&&!/^matrix\(1, 0, 0, 1, /.test(t);
     }).slice(0,5).map(h=>h.textContent?.trim().slice(0,80)),
     images:{loaded:images.filter(i=>i.naturalWidth>0).length,
      unloadedLazy:images.filter(i=>i.loading==='lazy'&&!i.complete).length,
      confirmedBroken:images.filter(i=>i.complete&&i.naturalWidth===0).length,
      otherPending:images.filter(i=>i.loading!=='lazy'&&!i.complete).length}
    };
   });
   const screenshot='case-'+index+'-export-'+device+'.png';
   await page.screenshot({path:join(OUT,screenshot),fullPage:true,timeout:30000});
   entry.screenshots.push(screenshot);
   measurements.push({device,...finding});
  }
  const serviceLink=page.locator('a[href^="services.html"]').first();
  if(await serviceLink.count()){
   await serviceLink.click({timeout:10000});
   entry.exportNavigation={clicked:'services.html',destination:new URL(page.url()).pathname,landedOnServices:new URL(page.url()).pathname==='/services.html'};
  }
  return measurements;
 }finally{await context.close()}
}

async function screenshotAndMeasure(page,label,path){
 const frame=page.locator('iframe[title^="Website preview:"]').first();
 await frame.waitFor({state:'visible',timeout:12000});
 const html=page.frameLocator('iframe[title^="Website preview:"]').locator('html');
 // A lazy image outside the current inner viewport is untested, not broken.
 // Let visible/priority images settle before the screenshot and preserve pending counts.
 await html.evaluate(async()=>{
  const images=[...document.images].filter(img=>img.loading!=='lazy'||img.getBoundingClientRect().top<window.innerHeight);
  await Promise.race([Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{
   img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});
  }))),new Promise(resolve=>setTimeout(resolve,7000))]);
 });
 const measurements=await html.evaluate(element=>{
  const imgs=[...element.querySelectorAll('img')];
  return {contentWidth:element.clientWidth,scrollWidth:element.scrollWidth,scrollHeight:element.scrollHeight,clientHeight:element.clientHeight,
   imagery:{loaded:imgs.filter(x=>x.naturalWidth>0).length,
    unloadedLazy:imgs.filter(x=>x.loading==='lazy'&&!x.complete).length,
    confirmedBroken:imgs.filter(x=>x.complete&&x.naturalWidth===0).length,
    otherPending:imgs.filter(x=>!x.complete&&x.loading!=='lazy').length}};
 });
 await frame.screenshot({path:join(OUT,path),timeout:25000});
 return {label,...measurements};
}
async function runOne(browser,item,index){
 const entry={business:item.business,mode:item.mode,sourceUrl:item.url,status:'blocked',firstFailure:null,sourceEvidence:null,generatedPages:[],screenshots:[]};
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
 const page=await context.newPage();
 page.setDefaultTimeout(16000);
 page.on('response',response=>{
  if(new URL(response.url()).pathname!=='/api/site-reference')return;
  void response.json().then(data=>{entry.sourceEvidence={
   httpStatus:response.status(),inspectedUrl:data.url||null,
   pageSummaries:(data.pageSummaries||[]).map(p=>({path:p.path,label:p.label,imageCount:p.images?.length||0})),
   navigation:(data.navigation||[]).slice(0,30).map(link=>({label:link.label,path:link.path})),
   warnings:(data.warnings||[]).slice(0,20),
   measuredGeometry:!!data.browserEvidence?.pages?.some(p=>p.designTokens)
  }}).catch(()=>{entry.sourceEvidence={httpStatus:response.status(),error:'Inspection response was not parseable JSON'}});
 });
 try{
  await page.goto(BASE+'/business',{waitUntil:'domcontentloaded',timeout:35000});
  const mode=page.getByRole('combobox',{name:/^Design approach/});
  await mode.waitFor({state:'visible',timeout:30000});
  // Changing a select before React hydration modifies the DOM without updating state.
  await page.waitForFunction(()=>{
   const input=[...document.querySelectorAll('select')].find(el=>el.closest('label')?.textContent?.includes('Design approach'));
   return !!input&&Object.keys(input).some(key=>key.startsWith('__reactFiber$'));
  },null,{timeout:20000});
  const sourceInput=page.locator('input[placeholder="e.g. disney.com"]');
  for(let attempt=0;attempt<3;attempt++){
   await mode.selectOption(item.mode);
   if(await sourceInput.isVisible().catch(()=>false))break;
   if(attempt===1)await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForTimeout(500);
  }
  if(!await sourceInput.isVisible()){
   const actual=await mode.inputValue().catch(()=>'unknown');
   throw Error('Expected website address field absent after hydration; selected design approach='+actual);
  }
  await sourceInput.fill(item.url);
  const extractLabel=item.mode==='redesign'?'Extract website details for redesign':'Extract website appearance';
  await page.getByRole('button',{name:extractLabel,exact:true}).click();
  await page.waitForFunction(()=>/Website extracted:|Website extraction failed:/i.test(document.body.innerText),null,{timeout:95000});
  const visible=(await page.locator('body').innerText()).slice(-4500);
  if(!visible.includes('Website extracted:'))throw Error('Source inspection unsuccessful: '+(visible.match(/Website extraction failed:[^\n]*/i)?.[0]||'unavailable'));
  await page.getByRole('button',{name:/generate my website/i}).click();
  const nav=page.getByRole('navigation',{name:'Website pages'});
  await nav.waitFor({state:'visible',timeout:110000});
  entry.generatedPages=(await nav.locator('button').allTextContents()).map(s=>s.trim()).filter(Boolean);
  const desktopName='case-'+(index+1)+'-desktop.png';
  entry.desktop=await screenshotAndMeasure(page,'desktop',desktopName);
  entry.screenshots.push(desktopName);
  await page.getByRole('button',{name:/switch to 390 pixel mobile website preview/i}).click();
  const mobileName='case-'+(index+1)+'-390px.png';
  entry.mobile=await screenshotAndMeasure(page,'390px mobile',mobileName);
  entry.screenshots.push(mobileName);
  if(entry.mobile.contentWidth!==390)throw Error('Phone iframe content is '+entry.mobile.contentWidth+'px instead of 390px');
  const downloadButton=page.getByRole('button',{name:'↓ Download complete website ZIP',exact:true});
  await downloadButton.waitFor({state:'visible',timeout:20000});
  const downloadPromise=page.waitForEvent('download',{timeout:30000});
  await downloadButton.click();
  const download=await downloadPromise;
  const filename=join(OUT,'case-'+(index+1)+'.zip');
  await download.saveAs(filename);
  const archive=await readFile(filename);
  entry.zip=zipGraph(archive);
  const exportedHomepage=unzipSync(archive)['index.html'];
  if(!exportedHomepage)throw Error('Exported website is missing index.html');
  const exportedHtml=strFromU8(exportedHomepage);
  entry.brandingReview=inspectExportedBranding(exportedHtml,item.business);
  entry.offeringImageCoverage=inspectExportedPhotoCoverage(exportedHtml);
  if(entry.brandingReview.promotionalLogoFound)
   throw Error('Exported site header uses a promotional partner logo rather than the company brand');
  if(!entry.zip.allPagesReachable||entry.zip.brokenLinks.length)throw Error('Exported site navigation contains unreachable pages or broken local links');
  entry.exportedSite=await inspectPortableExport(browser,archive,index+1,entry);
  if(entry.exportedSite.some(view=>view.documentWidth>view.viewportWidth+2))throw Error('Exported website has browser-confirmed horizontal page overflow');
  if(entry.exportNavigation&&entry.exportNavigation.landedOnServices!==true)throw Error('Exported homepage link did not navigate to services page');
  entry.status='structural_checks_passed_visual_review_pending';
 }catch(error){
  entry.firstFailure=String(error instanceof Error?error.message:error).slice(0,1100);
  entry.browserDiagnostic={url:page.url(),title:(await page.title().catch(()=>''))?.slice(0,160)};
  const failedName='case-'+(index+1)+'-blocked.png';
  try{await page.screenshot({path:join(OUT,failedName),fullPage:true,timeout:9000});entry.screenshots.push(failedName)}catch{}
 }
 finally{await context.close().catch(()=>{})}
 return entry;
}
await mkdir(OUT,{recursive:true});
const expected=process.env.FORGE_EXPECTED_REVISION;
const report={expectedRevision:expected,checkedAt:new Date().toISOString(),cases:[],warning:'Structural and screenshot evidence only; professional design and third-party image rights require independent review.'};
let failed=false;
try{
 await waitForRevision(expected);
 const browser=await chromium.launch({headless:true});
 try{for(let i=0;i<cases.length;i++){const entry=await runOne(browser,cases[i],i);report.cases.push(entry);console.log(JSON.stringify({business:entry.business,mode:entry.mode,status:entry.status,firstFailure:entry.firstFailure,pageCount:entry.zip?.pages.length||0}));if(entry.status!=='structural_checks_passed_visual_review_pending')failed=true;}}
 finally{await browser.close()}
}catch(error){report.blocker=String(error instanceof Error?error.message:error);failed=true}
await writeFile(join(OUT,'acceptance-results.json'),JSON.stringify(report,null,2));
if(failed)process.exitCode=1;
