import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const businesses=[{businessName:'Harbor Coffee',industry:'Coffee shop',description:'A neighborhood cafe selling coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs','Community events']},{businessName:'Baseball Supply',industry:'Baseball store',description:'A baseball shop supplying baseball bats, baseballs and gloves.',services:['Baseball bats','Baseballs','Gloves']},{businessName:'Northside Soccer',industry:'Soccer club',description:'A soccer club offering soccer training, teamwear and match tickets.',services:['Soccer training','Teamwear','Match tickets']}];
for(const business of businesses){
 for(const experienceStyle of ['standard','cinematic','object-navigation','immersive'] as const){
  test(`${business.businessName}: ${experienceStyle} has a relevant, distinct mobile presentation`,async({page})=>{
   test.setTimeout(60000);await page.setViewportSize({width:390,height:844});
   const site=generateBusinessWebsite({...business,experienceStyle});
   await page.route('https://design.test/**',route=>{const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';return route.fulfill({status:200,contentType:'text/html',body:site.pages.find(p=>p.slug===slug)?.html||''})});
   const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto('https://design.test/index.html',{waitUntil:'domcontentloaded'});
   if(experienceStyle==='immersive'){
    await expect(page.locator('#forge-immersive-world')).toHaveAttribute('data-loaded','true',{timeout:40000});
    await expect(page.locator('#forge-immersive-world')).toHaveAttribute('data-environment','panorama');
    await expect(page.locator('#forge-immersive-world canvas')).toBeVisible();
   }else{
    await expect(page.locator('main h1')).toContainText(business.businessName);
    if(experienceStyle==='cinematic')await expect(page.getByRole('navigation',{name:'Story chapters'})).toBeVisible();
    if(experienceStyle==='object-navigation'){await expect(page.locator('[data-object-navigation]')).toBeVisible();if(business.industry==='Baseball store'||business.industry==='Soccer club')await expect(page.locator('[data-object-navigation]')).toHaveAttribute('data-model-quality','textured-asset',{timeout:30000});}
    await page.waitForFunction(()=>Array.from(document.images).filter(image=>{const rect=image.getBoundingClientRect();return rect.width>0&&rect.height>0&&rect.top<innerHeight*1.5}).every(image=>image.complete&&image.naturalWidth>0),{},{timeout:25000});
   }
   expect(errors).toEqual([]);expect(await page.locator('body').evaluate(body=>body.scrollWidth)).toBeLessThanOrEqual(392);
   await test.info().attach(business.businessName+'-'+experienceStyle+'-mobile',{body:await page.screenshot(),contentType:'image/png'});
   await page.setViewportSize({width:1440,height:900});await test.info().attach(business.businessName+'-'+experienceStyle+'-desktop',{body:await page.screenshot(),contentType:'image/png'});
  });
 }
}
test('unclear business names request context instead of silently producing an office website',async({page})=>{
 let calls=0;await page.route('**/api/ai/business',route=>{calls++;return route.abort()});
 await page.goto('/business');await page.getByPlaceholder('e.g. Northstar Coffee').fill('Soccet');await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.getByText(/Tell Forge what this business does/)).toBeVisible();expect(calls).toBe(0);
});
