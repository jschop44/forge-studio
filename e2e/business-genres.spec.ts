import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const genres=['Coffee shop and cafe','Sporting goods retail','Healthcare and medical services','Pharmacy','Restaurant and hospitality','Real estate','Technology','Education and tutoring','Home and trade services','Legal services','Financial services','Beauty and personal care','Pet and animal care','Agriculture and farming','Manufacturing and industrial','Logistics and transportation','Nonprofit and community organization','Family-friendly Halloween festival','Local newspaper','Research laboratory'];
for(const genre of genres){
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  test(genre+' renders at '+viewport.width+'px',async({page})=>{
   await page.setViewportSize(viewport);
   const generated=generateBusinessWebsite({businessName:'Example Business',industry:genre,description:'A neighborhood business serving its local community.',services:['Customer support','Information']});
   const html=generated.pages[0].html;
   await page.route('**/*',route=>route.request().resourceType()==='image'?route.abort():route.continue());
   await page.setContent(html,{waitUntil:'domcontentloaded'});
   await expect(page.locator('h1').first()).toBeVisible();
   await expect(page.locator('nav')).toBeVisible();
   expect(await page.locator('a[href="services.html"]').count()).toBeGreaterThanOrEqual(2);
   expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(viewport.width+2);
   expect(await page.locator('img:not([alt])').count()).toBe(0);
   expect(await page.locator('script:not([type="application/ld+json"])').count()).toBe(0);
  });
 }
}
