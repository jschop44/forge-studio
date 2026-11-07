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
