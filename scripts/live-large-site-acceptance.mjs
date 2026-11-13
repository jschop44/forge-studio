import {chromium} from '@playwright/test';
import {unzipSync,strFromU8} from 'fflate';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,posix} from 'node:path';

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
async function screenshotAndMeasure(page,label,path){
 const frame=page.locator('iframe[title^="Website preview:"]').first();
 await frame.waitFor({state:'visible',timeout:12000});
 const html=page.frameLocator('iframe[title^="Website preview:"]').locator('html');
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
   warnings:(data.warnings||[]).slice(0,20),
   measuredGeometry:!!data.browserEvidence?.pages?.some(p=>p.designTokens)
  }}).catch(()=>{entry.sourceEvidence={httpStatus:response.status(),error:'Inspection response was not parseable JSON'}});
 });
 try{
  await page.goto(BASE+'/business',{waitUntil:'domcontentloaded',timeout:35000});
  await page.getByRole('combobox',{name:/^Design approach/}).selectOption(item.mode);
  await page.getByPlaceholder('e.g. disney.com').fill(item.url);
  await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
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
  entry.zip=zipGraph(await readFile(filename));
  if(!entry.zip.allPagesReachable||entry.zip.brokenLinks.length)throw Error('Exported site navigation contains unreachable pages or broken local links');
  entry.status='structural_checks_passed_visual_review_pending';
 }catch(error){entry.firstFailure=String(error instanceof Error?error.message:error).slice(0,1100)}
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
