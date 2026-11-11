import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const brief={experienceStyle:'standard',businessName:'Harbor Coffee',industry:'Coffee shop',description:'A neighborhood roastery selling coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs']};
async function generate(page:import('@playwright/test').Page,runtime=false){
 await page.route('**/api/ai/business',route=>{
  const pages=generateBusinessWebsite(brief).pages;
  if(runtime)pages[0].html=pages[0].html.replace('</body>','<script>void 0;</script></body>');
  return route.fulfill({status:200,json:{provider:'browser-test-fixture',pages}});
 });
 await page.goto('/business');
 await page.getByRole('textbox',{name:'Business name',exact:true}).fill(brief.businessName);
 await page.getByRole('textbox',{name:'What does your business do? (needed when the name is unclear)',exact:true}).fill('Industry: Coffee shop; Offerings: Coffee beans, Ceramic mugs\n'+brief.description);
 await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.getByRole('navigation',{name:'Website pages'})).toBeVisible();
}
test('approved standard pages retain inert SEO metadata when submitted for hosted publishing',async({page})=>{
 let submitted:Record<string,unknown>|undefined;
 await page.route('**/api/business/publish',route=>{submitted=route.request().postDataJSON();return route.fulfill({status:503,json:{error:'Business publishing is not configured'}})});
 await generate(page);
 const button=page.getByRole('button',{name:'Publish approved draft (if enabled)',exact:true});
 await expect(button).toBeDisabled();
 await page.getByLabel('I reviewed every generated page and approve publishing this business website.').check();
 await expect(button).toBeEnabled();await button.click();
 await expect(page.getByText('Business publishing is not configured',{exact:false}).first()).toBeVisible();
 expect(submitted?.ownerApproved).toBe(true);
 const pages=submitted?.pages as {html:string}[];
 expect(pages).toHaveLength(4);expect(pages.every(page=>page.html.includes('<script type="application/ld+json">'))).toBe(true);
});
test('runtime-dependent drafts explain hosted publishing limits and cannot submit approval',async({page})=>{
 let requests=0;await page.route('**/api/business/publish',route=>{requests++;return route.fulfill({status:500})});
 await generate(page,true);
 await page.getByLabel('I reviewed every generated page and approve publishing this business website.').check();
 await expect(page.getByRole('button',{name:'Publish approved draft (if enabled)',exact:true})).toBeDisabled();
 await expect(page.getByText('Hosted publishing is unavailable for this draft.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'↓ Download complete website ZIP',exact:true})).toBeEnabled();
 expect(requests).toBe(0);
});
