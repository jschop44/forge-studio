import {test,expect} from '@playwright/test';
import {makeExperience} from '../src/lib/experiences';
import {renderExperienceHtml} from '../src/lib/experience-quality';

test('experience-lab preview CTA navigates to its actual section',async({page})=>{
 await page.goto('/experiences');
 const link=page.locator('.experience-hero .experience-copy a');
 await expect(link).toHaveAttribute('href','#story');
 await link.click();
 await expect(page).toHaveURL(/#story$/);
 await expect(page.locator('.experience-section#story')).toBeVisible();
});

for(const width of [375,390,768]){
 test('exported experience stays readable, keyboard accessible and navigable at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:844});
  const e=makeExperience('business');
  e.hero.headline='Professional bespoke home renovation and project management solutions';
  e.hero.cta='Get in touch';
  e.sections=[{id:'overview',title:'Our services',body:'Residential project management and remodelling.'},
   {id:'contact',title:'Contact the team',body:'Talk to us about your next project.'}];
  await page.setContent(renderExperienceHtml(e),{waitUntil:'domcontentloaded'});
  const anchor=page.locator('main a.experience-cta');
  await expect(anchor).toHaveAttribute('href','#contact');
  await anchor.focus();
  await expect(anchor).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('#contact')).toBeVisible();
  const extent=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(extent.document).toBeLessThanOrEqual(extent.viewport);
 });
}
