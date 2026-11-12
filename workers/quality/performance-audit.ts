import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
import {chromium} from '@playwright/test';
const origin='https://forge-studio-preview.stands-old-3h.workers.dev';
/** Performance acceptance is restricted to the owned Forge deployment, without credentials. */
export async function auditForgePerformance(path='/business'){
 const url=new URL(path,origin);
 if(url.origin!==origin||url.username||url.password||url.search||url.hash||!/^\/(?:business|business-sites\/[a-f0-9-]{36}\/[a-z0-9-]+)$/.test(url.pathname))throw Error('Unauthorized performance target');
 const chrome=await launch({chromePath:chromium.executablePath(),chromeFlags:['--headless=new','--disable-dev-shm-usage']});
 try{
  const result=await lighthouse(url.href,{port:chrome.port,logLevel:'error',output:'json',onlyCategories:['performance','accessibility','best-practices','seo'],maxWaitForLoad:20000});
  if(!result||result.lhr.runtimeError)throw Error('Lighthouse did not complete');
  const scores=Object.fromEntries(Object.entries(result.lhr.categories).map(([name,value])=>[name,Math.round((value.score||0)*100)]));
  return {url:url.href,scores,passed:scores.performance>=80&&scores.accessibility>=90,measuredAt:new Date().toISOString(),scope:'owned-deployment-navigation'};
 }finally{await chrome.kill()}
}
