import {test,expect} from '@playwright/test';

test('phone-sized Forge editor starts in the real mobile preview and retains manual override',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/business');
 const mobile=page.getByRole('button',{name:'Switch to 390 pixel mobile website preview'});
 const desktop=page.getByRole('button',{name:'Switch to full-width desktop website preview'});
 await expect(mobile).toHaveAttribute('aria-pressed','true');
 await expect(desktop).toHaveAttribute('aria-pressed','false');
 await desktop.click();
 await expect(desktop).toHaveAttribute('aria-pressed','true');
 await mobile.click();
 await expect(mobile).toHaveAttribute('aria-pressed','true');
});

test('desktop editor still starts with desktop preview',async({page})=>{
 await page.setViewportSize({width:1280,height:850});
 await page.goto('/business');
 await expect(page.getByRole('button',{name:'Switch to full-width desktop website preview'})).toHaveAttribute('aria-pressed','true');
});
