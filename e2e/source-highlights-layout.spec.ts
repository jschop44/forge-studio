import {test,expect} from '@playwright/test';
import {applySourceDesign} from '../src/lib/apply-source-design';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';

test('published source highlights have uniform responsive heights despite mismatched source dimensions',async({page})=>{
 const dna=extractWebsiteDesignDna(
  '<img src="/wide.jpg" alt="Saturday outdoor neighborhood celebration" width="2048" height="878">'+
  '<img src="/portrait.jpg" alt="Team members welcoming guests at the entrance" width="500" height="900">'+
  '<img src="/square.jpg" alt="Handmade pottery collection on a display" width="800" height="800">',
  'https://reference.example/');
 const cards=['Planning','Scheduling','Support'].map(title=>'<article class="service-card"><h2>'+title+'</h2></article>').join('');
 const original={slug:'index',title:'Home',html:'<!doctype html><html><head></head><body><main><h1>Welcome</h1>'+cards+'</main></body></html>'};
 const html=applySourceDesign([original],dna,'inspired').pages[0].html;
 await page.route('https://reference.example/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==','base64')}));
 const heights=async()=>{
  const images=page.locator('.source-highlights img');
  await expect(images).toHaveCount(3);
  return images.evaluateAll(items=>items.map(item=>Math.round(item.getBoundingClientRect().height)));
 };
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:850});
  await page.setContent(html,{waitUntil:'domcontentloaded'});
  const measured=await heights();
  expect(new Set(measured).size).toBe(1);
  expect(measured[0]).toBeGreaterThanOrEqual(210);
  expect(measured[0]).toBeLessThanOrEqual(280);
  const documentWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(width+2);
 }
});
