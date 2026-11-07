import {test,expect} from '@playwright/test';
import {enhanceImmersivePages} from '../src/lib/immersive-showcase';
import {generateBusinessWebsite} from '../src/lib/business-site';

const source='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><section style="height:120vh">First</section><section style="height:120vh">Second</section></main></body></html>';

test('generated secondary page renders immersive WebGL without breaking page content',async({page})=>{
 const html=enhanceImmersivePages([{slug:'services',html:source}])[0].html;
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent(html);
 await expect(page.locator('main section')).toHaveCount(2);
 await expect(page.locator('#forge-spatial-controller')).toHaveCount(1);
 await expect(page.locator('#forge-spatial-layer')).toHaveCount(1);
 await page.waitForTimeout(200);
 const canvas=page.locator('#forge-webgl-atmosphere');
 if(await canvas.count()){
  await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).width)).toBeGreaterThan(0);
  await page.mouse.move(200,180);
  await page.mouse.down();
  await page.mouse.up();
  await page.evaluate(()=>window.scrollTo(0,window.innerHeight));
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector('main section')!).getPropertyValue('--forge-section-depth'))).not.toBe('');
 }
 expect(errors).toEqual([]);
});

test('reduced motion keeps immersive page content accessible without a GPU canvas',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const html=enhanceImmersivePages([{slug:'about',html:source}])[0].html;
 await page.setContent(html);
 await expect(page.locator('main section')).toHaveCount(2);
 await expect(page.locator('#forge-webgl-atmosphere')).toHaveCount(0);
 await expect(page.locator('#forge-spatial-layer')).toHaveCount(1);
});

test('scene keyboard controls preserve native scrolling and editable fields',async({page})=>{
 const html=enhanceImmersivePages([{slug:'contact',html:source.replace('<main>','<main><input aria-label="Your name" />')}])[0].html;
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent(html);
 await page.keyboard.press('ArrowDown');
 await page.locator('input').focus();
 await page.keyboard.type('Example');
 await expect(page.locator('input')).toHaveValue('Example');
 await expect(page.locator('main section')).toHaveCount(2);
 expect(errors).toEqual([]);
});

test('homepage receives shared WebGL renderer without secondary-page CSS overrides',async({page})=>{
 const html=enhanceImmersivePages([{slug:'index',html:source}])[0].html;
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent(html);
 await expect(page.locator('#forge-home-webgl')).toHaveCount(1);
 await expect(page.locator('#forge-home-webgl-controller')).toHaveCount(1);
 await expect(page.locator('#forge-spatial-layer')).toHaveCount(0);
 await expect(page.locator('main section')).toHaveCount(2);
 expect(errors).toEqual([]);
});

test('production generator exports immersive Home Services About and Contact pages',async({page})=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice serving local clients.',services:['Architecture','Interior design']}).pages;
 expect(pages.map(item=>item.slug)).toEqual(['index','services','about','contact']);
 for(const generated of pages){
  const errors:string[]=[];
  const onError=(error:Error)=>errors.push(error.message);
  page.on('pageerror',onError);
  await page.setContent(generated.html);
  await expect(page.locator('main#main-content')).toHaveCount(1);
  await expect(page.locator('#forge-webgl-atmosphere')).toHaveCount(1);
  await expect(page.locator('nav[aria-label="Main navigation"]')).toHaveCount(1);
  expect(errors,generated.slug).toEqual([]);
  page.off('pageerror',onError);
 }
});
