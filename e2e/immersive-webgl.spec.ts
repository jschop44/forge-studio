import {test,expect} from '@playwright/test';
import {enhanceImmersivePages} from '../src/lib/immersive-showcase';

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
