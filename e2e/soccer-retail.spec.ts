import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
for(const width of [390,1440])test('soccer retail has photography and product navigation at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.route('https://images.unsplash.com/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')}));
 const site=generateBusinessWebsite({businessName:'Soccer',industry:'Soccer sports memorabilia',description:'Soccer memorabilia and equipment for enthusiasts and collectors.',services:['Soccer memorabilia','Soccer equipment'],experienceStyle:'standard'});
 await page.setContent(site.pages[0].html);
 const image=page.locator('.site-hero>.editorial-photo img');await expect(image).toBeVisible();
 await expect(page.getByRole('link',{name:'Explore products',exact:true})).toHaveAttribute('href','services.html');
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);
 if(width===390){const photo=await image.boundingBox(),heading=await page.locator('h1').boundingBox();expect(photo!.width).toBeGreaterThan(200);expect(photo!.y+photo!.height).toBeLessThan(heading!.y)}
});
