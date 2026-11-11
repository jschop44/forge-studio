import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';

test('inline labeled business facts reach generation without industry pollution or lost offerings',async({page})=>{
 let received:Record<string,unknown>|undefined;let recognitionCalls=0;
 await page.route('**/api/business/recognize',route=>{recognitionCalls++;return route.fulfill({status:500,json:{error:'Explicit facts should not need recognition'}})});
 await page.route('**/api/ai/business',route=>{
  received=route.request().postDataJSON();
  const site=generateBusinessWebsite(received!);
  return route.fulfill({status:200,json:{provider:'browser-test-fixture',pages:site.pages}});
 });
 await page.goto('/business');
 await page.getByRole('textbox',{name:'Business name',exact:true}).fill('Harbor Coffee');
 await page.getByRole('textbox',{name:'What does your business do? (needed when the name is unclear)',exact:true}).fill('Industry: Coffee shop; Offerings: Coffee beans, Ceramic mugs\nA neighborhood roastery serving its local community.');
 await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.getByRole('navigation',{name:'Website pages'})).toBeVisible();
 expect(received?.industry).toBe('Coffee shop');
 expect(received?.services).toEqual(['Coffee beans','Ceramic mugs']);
 expect(recognitionCalls).toBe(0);
 const preview=page.frameLocator('iframe[title="Website preview: Home"]');
 await expect(preview.getByRole('heading',{name:'Coffee beans',exact:true})).toBeVisible();
 await expect(preview.getByRole('heading',{name:'Ceramic mugs',exact:true})).toBeVisible();
});
