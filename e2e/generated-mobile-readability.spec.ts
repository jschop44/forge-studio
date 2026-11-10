import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';

for(const width of [375,390,768,1440]){
 test('cinematic text stays flat and chapter controls do not cover content at '+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  const site=generateBusinessWebsite({businessName:'Harbor Pizza',industry:'Pizza restaurant',description:'Pizza, wings and pasta.',services:['Pizza','Wings','Pasta'],experienceStyle:'cinematic'});
  for(const generated of site.pages){
   await page.setContent(generated.html,{waitUntil:'domcontentloaded'});
   await page.mouse.move(width/2,400);
   const chapter=page.locator('.cinematic-chapters');
   const chapterCount=await page.locator('.site-hero,.service-card').count();
   await expect(chapter).toHaveCount(chapterCount?1:0);
   if(chapterCount)await expect(chapter).toHaveCSS('position','relative');
   const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
   for(const el of await page.locator('.site-hero>div,.service-card').all()){
    const value=await el.evaluate(node=>getComputedStyle(node).transform);
    expect(value).not.toContain('matrix3d');
   }
   if(!chapterCount)continue;
   const controlBox=await chapter.boundingBox();
   const footerBox=await page.locator('body>footer').boundingBox();
   expect(controlBox).toBeTruthy();expect(footerBox).toBeTruthy();
   expect(controlBox!.y+controlBox!.height).toBeLessThanOrEqual(footerBox!.y+1);
  }
 });
}
