import {test,expect} from '@playwright/test';
import {createContextualShowcase} from '../src/lib/immersive-showcase';

test('immersive object supports keyboard rotation and reset',async({page})=>{
 const html=createContextualShowcase({businessName:'Test Realty',industry:'Real estate',description:'Property experts.',services:['Home sales','Property tours']})[0].html;
 await page.goto('about:blank');
 await page.setContent(html,{waitUntil:'domcontentloaded'});
 const object=page.locator('#interactive-object');
 await expect(object).toHaveAttribute('tabindex','0');
 await object.focus();
 await page.keyboard.press('ArrowRight');
 await expect(object).toHaveAttribute('style',/rotateY\(8deg\)/);
 await page.keyboard.press('ArrowUp');
 await expect(object).toHaveAttribute('style',/rotateX\(-8deg\)/);
 await page.keyboard.press('Escape');
 await expect(object).toHaveAttribute('style',/rotateX\(0deg\) rotateY\(0deg\)/);
});

test('immersive service details expand and collapse from keyboard',async({page})=>{
 const html=createContextualShowcase({businessName:'Test Cafe',industry:'Coffee shop',description:'Neighborhood coffee.',services:['Espresso drinks','Fresh pastries']})[0].html;
 await page.goto('about:blank');
 await page.setContent(html,{waitUntil:'domcontentloaded'});
 const toggle=page.locator('.details-toggle').first();
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 const panelId=await toggle.getAttribute('aria-controls');
 expect(panelId).toBeTruthy();
 const panel=page.locator('[id="'+panelId+'"]');
 await expect(panel).toBeHidden();
 await toggle.focus();
 await page.keyboard.press('Enter');
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(panel).toBeVisible();
 await page.keyboard.press('Enter');
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(panel).toBeHidden();
});

test('keyboard perspective remains available with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const html=createContextualShowcase({businessName:'Test Realty',industry:'Real estate',description:'Property experts.',services:['Home sales']})[0].html;
 await page.goto('about:blank');
 await page.setContent(html,{waitUntil:'domcontentloaded'});
 const object=page.locator('#interactive-object');
 await object.focus();
 await page.keyboard.press('ArrowLeft');
 await expect(object).toHaveAttribute('style',/rotateY\(-8deg\)/);
 await page.keyboard.press('Escape');
 await expect(object).toHaveAttribute('style',/rotateY\(0deg\)/);
});
