import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';
import {createExtractedPages,applyExtractedExperience} from '../src/lib/extracted-pages';

const business={
 businessName:'Green Market',industry:'Fresh produce retail',
 description:'A local fruit and produce market with fresh seasonal fruit and ready-made fruit baskets.',
 services:['Seasonal fruit','Fruit baskets'],experienceStyle:'standard' as const
};
const observed={
 backgroundColor:'rgb(250, 245, 231)',textColor:'rgb(28, 42, 36)',
 fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',
 headingFontSize:'52px',baseFontSize:'16px',
 heroTextAlign:'center' as const,heroLayout:'stacked' as const,contentMaxWidth:'960px',
 buttonRadius:'32px',buttonBackgroundColor:'rgb(34, 73, 54)',
 buttonTextColor:'rgb(255, 255, 255)',headerBackgroundColor:'rgb(251, 247, 235)'
};
const capture={version:1,sourceUrl:'https://client-market.example/',capturedAt:'2026-11-13T00:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{path:'/',title:'Green Market',landmarks:[],interactions:[],designTokens:observed}]};
for(const width of [390,1280]){
 test('preserved client layout renders with source heading, button shape and readable navigation at '+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.route('**/*',route=>route.request().resourceType()==='image'?route.abort():route.continue());
  const pages=generateBusinessWebsite(business).pages;
  const generated=applyCapturedAppearance(pages,capture,'https://client-market.example/','inspired');
  await page.setContent(generated.pages[0].html,{waitUntil:'domcontentloaded'});
  await expect(page.locator('nav[aria-label="Main navigation"]')).toHaveCSS('background-color','rgb(251, 247, 235)');
  await expect(page.locator('main .site-hero>div')).toHaveCSS('text-align','center');
  await expect(page.locator('.site-hero .button')).toHaveCSS('border-radius','32px');
  await expect(page.locator('.site-hero .button')).toHaveCSS('background-color','rgb(34, 73, 54)');
  const rect=await page.locator('main').boundingBox();expect(rect!.width).toBeLessThanOrEqual(961);
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(horizontal).toBeLessThanOrEqual(2);
  await expect(page.locator('.site-hero h1')).toBeVisible();
  await expect(page.locator('nav a[href="contact.html"]')).toBeVisible();
 });
}
test('full redesign intentionally keeps new art direction rather than captured source layout',async({page})=>{
 const pages=generateBusinessWebsite(business).pages;
 const redesigned=applyCapturedAppearance(pages,capture,'https://client-market.example/','redesign');
 assertEqual(redesigned.pages[0].html,pages[0].html);
 await page.setContent(redesigned.pages[0].html,{waitUntil:'domcontentloaded'});
 await expect(page.locator('body')).toHaveAttribute('data-forge-business','produce');
});
function assertEqual(a:string,b:string){expect(a).toBe(b)}

for(const width of [390,1280]){
 test('captured source style preserves extracted product layout without clipping at '+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.route('**/*',route=>route.request().resourceType()==='image'?route.abort():route.continue());
  const evidence={url:'https://client-market.example/',title:'Green Market',description:'',headings:[],pageSummaries:[{
   path:'/wraps',label:'Wraps',title:'Recovery Wraps and Accessories for Every Active Lifestyle',
   description:'Recovery wraps that serve active clients.',headings:['Recovery wraps'],
   images:[{url:'https://client-market.example/wrap.jpg',alt:'Recovery Wrap',role:'content' as const,sourcePage:'https://client-market.example/wraps',width:900,height:600}]
  }]};
  const extracted=applyExtractedExperience(createExtractedPages(evidence,'Green Market'),'standard',{businessName:'Green Market',industry:'Health and wellness',services:['Recovery wraps']});
  const style={...observed,contentMaxWidth:'1280px',heroLayout:'stacked' as const};
  const captured={...capture,pages:[...capture.pages,{...capture.pages[0],path:'/wraps',designTokens:style}]};
  const result=applyCapturedAppearance(extracted,captured,evidence.url,'preserve',{wraps:'https://client-market.example/wraps'});
  await page.setContent(result.pages[0].html,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.extracted-hero h1')).toBeVisible();
  await expect(page.locator('.extracted-hero')).toHaveCSS('grid-template-columns',/\d+px/);
  const heading=await page.locator('.extracted-hero h1').boundingBox();
  const photo=await page.locator('.extracted-hero figure').boundingBox();
  expect(heading).not.toBeNull();expect(photo).not.toBeNull();
  expect(photo!.y).toBeGreaterThan(heading!.y);
  expect((await page.locator('main').boundingBox())!.width).toBeLessThanOrEqual(width+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}
