import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';

const fruit={
 businessName:'Fruit stand fresh',industry:'Fresh produce retail',
 description:'A neighborhood fruit stand with locally grown fruit, seasonal produce and fruit baskets.',
 services:['Locally grown fruit','Fruit baskets'],experienceStyle:'standard' as const
};
for(const width of [390,1440]){
 test('fresh produce has distinctive market visuals and no horizontal overflow at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.route('**/*',route=>route.request().resourceType()==='image'?route.abort():route.continue());
  const draft=generateBusinessWebsite(fruit);
  await page.setContent(draft.pages[0].html,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toHaveAttribute('data-forge-business','produce');
  await expect(page.locator('.forge-editorial')).toHaveAttribute('data-editorial-theme','produce');
  expect(await page.locator('.forge-editorial__photo').count()).toBeGreaterThanOrEqual(2);
  expect(await page.locator('main img').count()).toBeGreaterThanOrEqual(3);
  const styles=await page.evaluate(()=>{
   const hero=document.querySelector('.site-hero')!;
   const mark=document.querySelector('nav .brand-mark')!;
   const gallery=document.querySelector('.forge-editorial__gallery')!;
   return {
    heroBackground:getComputedStyle(hero).backgroundImage,
    brandBackground:getComputedStyle(mark).backgroundColor,
    galleryDisplay:getComputedStyle(gallery).display,
    scroll:document.documentElement.scrollWidth,viewport:innerWidth
   };
  });
  expect(styles.heroBackground).toContain('radial-gradient');
  expect(styles.brandBackground).toBe('rgb(58, 94, 59)');
  expect(styles.galleryDisplay).toBe('grid');
  expect(styles.scroll).toBeLessThanOrEqual(styles.viewport+2);
 });
}
test('multi-page editorial imagery is given different copy for each destination',async({page})=>{
 const site=generateBusinessWebsite(fruit);
 const headings:string[]=[];
 for(const generated of site.pages){
  await page.setContent(generated.html,{waitUntil:'domcontentloaded'});
  const heading=page.locator('.forge-editorial h2');
  await expect(heading).toHaveCount(1);
  headings.push((await heading.textContent())?.trim()||'');
  const nav=page.locator('nav[aria-label="Main navigation"] a[href]');
  await expect(nav).toHaveCount(4);
  await expect(page.locator('main h1')).toHaveCount(1);
 }
 expect(new Set(headings).size).toBe(4);
});
