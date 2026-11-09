import {test,expect} from '@playwright/test';
import {businessEnvironment} from '../src/lib/business-environments';
import {generateBusinessWebsite} from '../src/lib/business-site';
const businesses=[{businessName:'Harbor Coffee',industry:'Coffee shop',description:'A neighborhood cafe selling coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs','Community events']},{businessName:'Baseball Supply',industry:'Baseball store',description:'A baseball shop supplying baseball bats, baseballs and gloves.',services:['Baseball bats','Baseballs','Gloves']},{businessName:'Northside Soccer',industry:'Soccer club',description:'A soccer club offering soccer training, teamwear and match tickets.',services:['Soccer training','Teamwear','Match tickets']},{businessName:'Northside Hospital',industry:'Healthcare and medical services',description:'Patient information and care coordination for our community.',services:['Care services','Patient information','Care coordination']},{businessName:'Basil Kitchen',industry:'Restaurant and hospitality',description:'Seasonal dining and thoughtfully prepared food in a welcoming setting.',services:['Seasonal menu','Private dining','Dinner reservations']},{businessName:'Meridian Horology',industry:'Clock restoration',description:'Restoration and maintenance of antique clocks and mechanical timepieces.',services:['Clock restoration','Mechanical servicing','Restoration consultations']}];
for(const business of businesses){
 for(const experienceStyle of ['standard','cinematic','object-navigation','immersive'] as const){
  test(`${business.businessName}: ${experienceStyle} has a relevant, distinct mobile presentation`,async({page})=>{
   test.setTimeout(90000);await page.setViewportSize({width:390,height:844});
   const site=generateBusinessWebsite({...business,experienceStyle});
   await page.route('https://design.test/**',route=>{const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';return route.fulfill({status:200,contentType:'text/html',body:site.pages.find(p=>p.slug===slug)?.html||''})});
   const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto('https://design.test/index.html',{waitUntil:'domcontentloaded'});
   if(experienceStyle==='immersive'){
    const scene=businessEnvironment(business.industry);
    if(scene.url){
     await expect(page.locator('#forge-immersive-world')).toHaveAttribute('data-loaded','true',{timeout:40000});
     await expect(page.locator('#forge-immersive-world')).toHaveAttribute('data-environment',scene.kind);
     await expect(page.locator('#forge-immersive-world canvas')).toBeVisible();
     if(scene.kind==='panorama'){
      const resolution=await page.locator('#forge-immersive-world').evaluate(root=>({source:Number((root as HTMLElement).dataset.sourceWidth),texture:Number((root as HTMLElement).dataset.textureWidth)}));
      expect(resolution.source).toBeGreaterThanOrEqual(7680);expect(resolution.texture).toBeGreaterThanOrEqual(7680);
     }
    }else{await expect(page.locator('#forge-immersive-world')).toBeHidden();await expect(page.locator('main h1')).toContainText(business.businessName)}
   }else{
    await expect(page.locator('main h1')).toContainText(business.businessName);
    if(await page.locator('#forge-business-photo').count()){
     const photo=page.locator('#forge-business-photo');await expect(photo).toHaveAttribute('data-loaded','true',{timeout:40000});
     if(experienceStyle==='cinematic'){
      await expect(photo).toHaveCSS('position','absolute');const imageBox=(await photo.boundingBox())!,heroBox=(await page.locator('.site-hero').boundingBox())!;
      expect(imageBox.width).toBeGreaterThanOrEqual(heroBox.width*.9);expect(imageBox.height).toBeGreaterThanOrEqual(heroBox.height*.9);
     }
    }
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

test('panorama preserves the 8K source and renders a true 4K viewport',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:3840,height:2160});
 const site=generateBusinessWebsite({...businesses[0],experienceStyle:'immersive'});
 await page.route('https://sharpness.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:site.pages[0].html}));
 await page.goto('https://sharpness.test/',{waitUntil:'domcontentloaded'});
 const root=page.locator('#forge-immersive-world');await expect(root).toHaveAttribute('data-loaded','true',{timeout:60000});
 const result=await root.evaluate(root=>{const canvas=root.querySelector('canvas')!;return {sourceWidth:Number((root as HTMLElement).dataset.sourceWidth),textureWidth:Number((root as HTMLElement).dataset.textureWidth),textureHeight:Number((root as HTMLElement).dataset.textureHeight),renderWidth:canvas.width,renderHeight:canvas.height}});
 expect(result).toEqual({sourceWidth:8192,textureWidth:8192,textureHeight:4096,renderWidth:3840,renderHeight:2160});
 await test.info().attach('panorama-resolution-evidence',{body:JSON.stringify(result),contentType:'application/json'});
 await test.info().attach('Harbor Coffee-panorama-4k',{body:await page.screenshot(),contentType:'image/png'});
});
