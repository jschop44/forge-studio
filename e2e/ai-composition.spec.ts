import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {createContextualShowcase} from '../src/lib/immersive-showcase';
test.use({reducedMotion:'reduce'});
const brief={businessName:'Cedar Studio',industry:'Design',description:'A design studio providing website services for local businesses.',services:['Website design']};
for(const width of [1280,390]){
 test('model-selected image-led layout adapts to '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.route('https://images.unsplash.com/**',route=>route.abort());
  const documents=[
   {html:generateBusinessWebsite({...brief,layout:'image-led',accent:'#9ee3bf'}).pages[0].html,hero:'.site-hero',image:'.editorial-photo'},
   {html:createContextualShowcase({...brief,design:{layout:'image-led',palette:'mint'}})[0].html,hero:'.hero',image:'.ai-hero-visual'}
  ];
  for(const fixture of documents){
   await page.goto('about:blank');
   await page.setContent(fixture.html,{waitUntil:'domcontentloaded'});
   await expect(page.locator('body')).toHaveAttribute('data-forge-layout','image-led');
   const hero=page.locator(fixture.hero);
   const copy=await hero.locator(':scope > div').first().boundingBox();
   const image=await hero.locator(fixture.image).boundingBox();
   expect(copy).not.toBeNull();expect(image).not.toBeNull();
   if(width>760)expect(image!.x).toBeGreaterThan(copy!.x+copy!.width-1);
   else expect(image!.y).toBeGreaterThanOrEqual(copy!.y+copy!.height-1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 });
}
