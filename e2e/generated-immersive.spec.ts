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
 await expect(beacon).toContainText('nearby');
 await expect(beacon).toBeVisible();
});
