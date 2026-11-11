import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {auditGeneratedDraft} from '../src/lib/draft-quality-gate';

const businesses=[
 {businessName:'Harbor Coffee',industry:'Coffee shop',description:'Freshly roasted coffee beans and ceramic mugs for neighborhood customers.',services:['Coffee beans','Ceramic mugs']},
 {businessName:'Meridian Horology',industry:'Clock restoration',description:'Restoring antique mechanical clocks and servicing historic timepieces.',services:['Clock restoration','Mechanical servicing']}
];
const modes=['standard','cinematic','object-navigation','immersive'] as const;
for(const brief of businesses)for(const experienceStyle of modes){
 test('client mobile acceptance: '+brief.industry+' in '+experienceStyle,async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  // A real client site must remain readable if images fail or WebGL is disabled.
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null});
  await page.route('**/*',route=>route.request().resourceType()==='image'?route.abort():route.continue());
  const site=generateBusinessWebsite({...brief,experienceStyle,layout:'image-led'});
  const audit=auditGeneratedDraft(site.pages);
  expect(audit.readyForReview,audit.errors.join('; ')).toBe(true);
  for(const generated of site.pages){
   await page.goto('about:blank');
   await page.setContent(generated.html,{waitUntil:'domcontentloaded'});
   await expect(page.locator('body')).toHaveAttribute('data-forge-experience',experienceStyle);
   await expect(page.locator('main h1')).toHaveCount(1);
   await expect(page.locator('nav[aria-label="Main navigation"]')).toHaveCount(1);
   expect(await page.locator('img:not([alt])').count()).toBe(0);
   const size=await page.evaluate(()=>({page:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:innerWidth}));
   expect(size.page,experienceStyle+' '+generated.slug+' horizontal document overflow').toBeLessThanOrEqual(size.viewport+2);
   expect(size.body,experienceStyle+' '+generated.slug+' body overflow').toBeLessThanOrEqual(size.viewport+2);
   if(experienceStyle==='immersive'){
    const world=page.locator('#forge-immersive-world');
    await expect(world).toHaveCount(1);
    const active=await world.isVisible();
    if(active)await expect(page.locator('[data-world-page], .content-head nav a').first()).toHaveCount(1);
    else await expect(page.locator('main h1')).toBeVisible();
   }
  }
 });
}
