import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
for(const width of [390,1440])for(const accent of ['#e3c89e','#9ee3bf','#9ed8f5'])test('toy retail stays illustrated and legible at '+width+'px with '+accent,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.route('https://images.unsplash.com/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')}));
 const site=generateBusinessWebsite({businessName:'Toys',industry:'Toy retail',description:'Kids toys and merchandise for browsing.',services:['Explore services','Discuss your project','Contact the team'],experienceStyle:'standard',accent});
 for(const slug of ['index','services']){
  await page.setContent(site.pages.find(p=>p.slug===slug)!.html);await expect(page.locator('.editorial-photo img').first()).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);
  if(slug==='services'){await expect(page.locator('.service-card h2')).toHaveText(['Toys']);await expect(page.locator('.service-card')).not.toContainText('Explore Explore')}
  const contrasts=await page.locator('.eyebrow').evaluateAll(nodes=>{
   const luminance=(color:string)=>{const c=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722};
   return nodes.map(node=>{const style=getComputedStyle(node),a=luminance(style.color),b=luminance(getComputedStyle(document.body).backgroundColor);return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),opacity:style.opacity}});
  });expect(contrasts.length).toBeGreaterThan(0);for(const result of contrasts){expect(result.ratio).toBeGreaterThanOrEqual(4.5);expect(result.opacity).toBe('1')}
 }
});

test('legacy arrival motion never fades text below its readable opacity',async({page})=>{
 await page.route('https://images.unsplash.com/**',route=>route.abort());
 const site=generateBusinessWebsite({businessName:'Toys',industry:'Toy retail',description:'Kids toys and merchandise for browsing.',services:['Toys']});
 await page.setContent(site.pages.find(p=>p.slug==='services')!.html,{waitUntil:'domcontentloaded'});
 const frames=await page.locator('main>.eyebrow').evaluate(node=>node.getAnimations().flatMap(animation=>animation.effect instanceof KeyframeEffect?animation.effect.getKeyframes().map(frame=>frame.opacity).filter(value=>value!==undefined):[]));
 expect(frames.length).toBeGreaterThan(0);for(const opacity of frames)expect(Number(opacity)).toBe(1);
 await expect(page.locator('main>.eyebrow')).toHaveCSS('opacity','1');
});
