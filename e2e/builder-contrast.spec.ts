import {test,expect,type Locator} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';

/** Measure rendered text against the composited background, including ancestor alpha. */
async function contrast(locator:Locator,pseudo?:string){
 return locator.evaluate((element,pseudo)=>{
  const rgba=(value:string)=>{const parts=value.match(/[\d.]+/g)?.map(Number)||[];return [parts[0]||0,parts[1]||0,parts[2]||0,parts.length>3?parts[3]:1]};
  const over=(top:number[],bottom:number[])=>[0,1,2].map(index=>top[index]*top[3]+bottom[index]*(1-top[3])).concat(1);
  const ancestors:Element[]=[];for(let node:Element|null=element;node;node=node.parentElement)ancestors.unshift(node);
  let background=[255,255,255,1];for(const node of ancestors)background=over(rgba(getComputedStyle(node).backgroundColor),background);
  const style=getComputedStyle(element,pseudo),foreground=over(rgba(style.color),background);
  const luminance=(value:number[])=>value.slice(0,3).map(channel=>{const n=channel/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((sum,n,index)=>sum+n*[.2126,.7152,.0722][index],0);
  const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 },pseudo);
}
for(const width of [390,1440]){
 test('light builder text and preview editing controls remain readable at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.route('**/api/ai/business',async route=>{
   const input=route.request().postDataJSON();
   const draft={businessName:input.businessName,industry:input.industry,description:'Coffee beans roasted in small batches.',services:input.services};
   await route.fulfill({status:200,json:{draft,provider:'browser-test-fixture',pages:generateBusinessWebsite({...draft,experienceStyle:'standard'}).pages}});
  });
  await page.goto('/business');
  await page.getByRole('button',{name:/generate my website/i}).click();
  await expect(page.locator('.forge-auto-status')).toBeVisible();
  expect(await contrast(page.locator('.forge-auto-status'))).toBeGreaterThanOrEqual(4.5);
  for(const selector of ['.forge-auto-note','.forge-auto-advanced>summary','.forge-auto-panel .optional']){
   for(const element of await page.locator(selector).all())if(await element.isVisible())expect(await contrast(element),selector).toBeGreaterThanOrEqual(4.5);
  }
  const name=page.getByPlaceholder('e.g. Northstar Coffee');
  expect(await contrast(name,'::placeholder')).toBeGreaterThanOrEqual(4.5);
  await name.fill('Northstar Coffee');
  await page.getByPlaceholder('Describe what you offer, who you serve and what makes you different.').fill('Industry: Coffee shop\nOfferings: Coffee beans, Espresso drinks');
  await page.getByRole('button',{name:/generate my website/i}).click();
  await expect(page.locator('.forge-auto-quick-edit')).toBeVisible({timeout:30000});
  for(const selector of ['.forge-auto-quick-edit label','.forge-auto-quick-edit input:not([type=color])','.forge-auto-quick-edit textarea','.forge-auto-quick-edit select','.forge-auto-export button']){
   for(const element of await page.locator(selector).all())if(await element.isVisible())expect(await contrast(element),selector).toBeGreaterThanOrEqual(4.5);
  }
  const input=page.getByLabel('Edit current page headline');
  await expect(input).toHaveCSS('background-color','rgb(255, 255, 255)');
 });
}
