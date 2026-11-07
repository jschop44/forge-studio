import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';

const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture','Interior design']}).pages;

for(const generated of pages){
 test('immersive browser initializes without runtime errors: '+generated.slug,async({page})=>{
  const failures:string[]=[];
  page.on('pageerror',error=>failures.push(error.message));
  await page.setContent(generated.html,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#forge-webgl-atmosphere')).toHaveCount(1);
  await expect(page.locator('[aria-label="Immersive world movement"]')).toHaveCount(1);
  await expect(page.locator('#forge-world-beacon-link')).toHaveAttribute('href','services.html');
  await page.waitForTimeout(200);
  expect(failures).toEqual([]);
 });
}

test('mobile directional pad remains interactive on generated homepage',async({page})=>{
 const home=pages.find(p=>p.slug==='index');
 expect(home).toBeTruthy();
 await page.setContent(home!.html,{waitUntil:'domcontentloaded'});
 const move=page.getByRole('button',{name:'Move right in immersive world'});
 await expect(move).toBeVisible();
 const beacon=page.locator('#forge-world-beacon-link');
 await expect(beacon).toContainText('follow beacon');
 for(let i=0;i<5;i++)await move.click();
 const down=page.getByRole('button',{name:'Move down in immersive world'});
 for(let i=0;i<5;i++)await down.click();
 await expect(beacon).toContainText('nearby');
 await expect(beacon).toBeVisible();
});

test('immersive navigation remains accessible when reduced motion is enabled',async({page})=>{
 const home=pages.find(p=>p.slug==='index');
 expect(home).toBeTruthy();
 await page.emulateMedia({reducedMotion:'reduce'});
 const failures:string[]=[];
 page.on('pageerror',error=>failures.push(error.message));
 await page.setContent(home!.html,{waitUntil:'domcontentloaded'});
 const beacon=page.locator('#forge-world-beacon-link');
 await expect(beacon).toHaveAttribute('href','services.html');
 await expect(beacon).toBeVisible();
 await expect(page.locator('#forge-webgl-atmosphere')).toHaveCount(1);
 await expect(page.locator('[aria-label="Immersive world movement"]')).toBeHidden();
 expect(failures).toEqual([]);
});

test('keyboard movement updates immersive beacon proximity',async({page})=>{
 const home=pages.find(p=>p.slug==='index');
 expect(home).toBeTruthy();
 await page.setContent(home!.html,{waitUntil:'domcontentloaded'});
 const beacon=page.locator('#forge-world-beacon-link');
 await expect(beacon).toContainText('follow beacon');
 await page.locator('body').click({position:{x:5,y:5}});
 for(let i=0;i<10;i++)await page.keyboard.press('d');
 for(let i=0;i<10;i++)await page.keyboard.press('s');
 await expect(beacon).toContainText('nearby');
});

test('changing reduced-motion preference updates movement controls without reloading',async({page})=>{
 const home=pages.find(p=>p.slug==='index');
 expect(home).toBeTruthy();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setContent(home!.html,{waitUntil:'domcontentloaded'});
 const controls=page.locator('[aria-label="Immersive world movement"]');
 await expect(controls).toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(controls).toBeHidden();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(controls).toBeVisible();
});
