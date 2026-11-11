import {test,expect} from '@playwright/test';
import {unzipSync,strFromU8} from 'fflate';
import {generateBusinessWebsite} from '../src/lib/business-site';

test('generator downloads one complete portable ZIP with working page and offering links',async({page})=>{
 await page.route('**/api/ai/business',route=>{
  const input=route.request().postDataJSON();
  const site=generateBusinessWebsite(input);
  site.pages[0].html=site.pages[0].html.replace('href="services.html"','href="/services#offering-0"');
  return route.fulfill({status:200,json:{provider:'browser-test-fixture',pages:site.pages}});
 });
 await page.goto('/business');
 await page.getByPlaceholder('e.g. Northstar Coffee').fill('Harbor Coffee');
 await page.getByPlaceholder('Describe what you offer, who you serve and what makes you different.').fill(
  'Industry: Coffee shop\nOfferings: Coffee beans, Ceramic mugs\nFreshly roasted coffee beans and handmade mugs for local customers.');
 await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.getByRole('navigation',{name:'Website pages'})).toBeVisible();
 const button=page.getByRole('button',{name:'↓ Download complete website ZIP',exact:true});
 await expect(button).toBeEnabled();
 const pending=page.waitForEvent('download');
 await button.click();
 const download=await pending;
 expect(download.suggestedFilename()).toBe('forge-website.zip');
 const stream=await download.createReadStream();if(!stream)throw Error('Website ZIP stream missing');
 const parts:Buffer[]=[];for await(const part of stream)parts.push(Buffer.from(part));
 const files=unzipSync(Buffer.concat(parts));
 expect(Object.keys(files).sort()).toEqual(['about.html','contact.html','index.html','services.html']);
 const home=strFromU8(files['index.html']),services=strFromU8(files['services.html']);
 expect(home).toContain('href="services.html#offering-0"');
 expect(home).not.toContain('href="/services#offering-0"');
 expect(services).toContain('id="offering-0"');
 expect(home).toContain('Harbor Coffee');
 expect(strFromU8(files['contact.html'])).toContain('Contact');
 await expect(page.getByRole('status').filter({hasText:/Complete 4-page website ZIP downloaded/})).toBeVisible();
});
