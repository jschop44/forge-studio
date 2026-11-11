import {test,expect,type Page} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';
const source='https://reference.example/';
const designDna=extractWebsiteDesignDna('<meta property="og:site_name" content="Harbor Coffee"><header><img src="/logo.png" alt="Harbor Coffee logo"></header><section class="hero"><img src="/beans.png" alt="Roasted coffee beans" width="800" height="600"></section><a href="mailto:hello@reference.example">Email</a><a href="tel:+15551234567">Call</a><style>body{background:#112233;color:#fff;font-family:Georgia,serif}</style>',source);
const extracted={url:source,title:'Roasted beans, ceramic mugs & more',description:'A neighborhood coffee shop offering roasted coffee beans and ceramic mugs.',headings:['Coffee beans','Ceramic mugs'],navigation:[],pageSummaries:[],stylesheetsRead:1,styleFound:true,styleReference:{background:'#112233',accent:'#ffffff',fontFamily:'Georgia'},designDna};
// Keep asset availability deterministic; the builder still receives actual HTTPS source URLs.
// Pillow-generated PNG with verified IHDR/IDAT/IEND CRCs; strict browser decoders reject bad CRCs.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==','base64');
async function mockGeneration(page:Page,onInput?:(input:Record<string,unknown>)=>void){
 await page.route('https://reference.example/**',route=>route.fulfill({status:200,contentType:'image/png',body:png}));
 await page.route('**/api/business/recognize',route=>route.fulfill({status:200,json:{status:'identified',industry:'Coffee shop',services:['Coffee beans','Ceramic mugs'],evidence:['coffee shop'],provider:'fixture'}}));
 await page.route('**/api/business/visuals',route=>route.fulfill({status:200,json:{assets:[]}}));
 await page.route('**/api/ai/business',route=>{const input=route.request().postDataJSON();onInput?.(input);return route.fulfill({status:200,json:{provider:'fixture',pages:generateBusinessWebsite(input).pages}})});
}
for(const mode of ['inspired','redesign'] as const)test(mode+': Extract then Generate reuses source assets and verified contact without a second extraction',async({page})=>{
 let extractions=0,generations=0;
 await page.route('**/api/site-reference',route=>{extractions++;return route.fulfill({status:200,json:extracted})});
 await mockGeneration(page,input=>{generations++;expect(input.designMode).toBe(mode);expect(input.businessName).toBe('Harbor Coffee');expect(input.services).toEqual(['Coffee beans','Ceramic mugs'])});
 await page.goto('/business');await page.getByRole('button',{name:/^Standard website/}).click();
 await page.getByRole('combobox',{name:/^Design approach/}).selectOption(mode);await page.getByPlaceholder('e.g. disney.com').fill('reference.example');
 await page.getByRole('button',{name:mode==='inspired'?'Extract website appearance':'Extract website details for redesign',exact:true}).click();
 await expect(page.getByText(/Website extracted: reference\.example\. Ready to generate/)).toBeVisible();
 await page.getByRole('button',{name:/generate my website/i}).click();
 const home=page.frameLocator('iframe[title="Website preview: Home"]');await expect(home.locator('main h1')).toHaveText('Harbor Coffee');
 await expect(home.locator('.source-brand-logo')).toHaveAttribute('src',source+'logo.png');
 // A specific product image belongs on the menu rather than being repeated on a homepage teaser.
 await expect(home.locator('main img[src="'+source+'beans.png"]')).toHaveCount(0);
 if(mode==='inspired'){
  await expect(home.locator('body')).toHaveCSS('background-color','rgb(17, 34, 51)');await expect(home.locator('body')).toHaveCSS('font-family',/Georgia/);
  await expect(home.locator('body>nav a').first()).toHaveCSS('color','rgb(248, 248, 248)');
 }else await expect(home.locator('body')).not.toHaveCSS('background-color','rgb(17, 34, 51)');
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Menu',exact:true}).click();
 const menu=page.frameLocator('iframe[title="Website preview: Menu"]');
 const sourcePhoto=menu.locator('#offering-0 img[data-forge-source-image]');
 await expect(sourcePhoto).toHaveAttribute('src',source+'beans.png');
 await sourcePhoto.scrollIntoViewIfNeeded();await expect(sourcePhoto).toHaveJSProperty('naturalWidth',1);
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Contact',exact:true}).click();
 const contact=page.frameLocator('iframe[title="Website preview: Contact"]');await expect(contact.locator('.source-brand-logo')).toHaveAttribute('src',source+'logo.png');
 await expect(contact.locator('a[href="mailto:hello@reference.example"]').first()).toBeVisible();await expect(contact.locator('a[href="tel:+15551234567"]').first()).toBeVisible();
 await expect(contact.locator('main')).not.toContainText('Contact details are being updated.');
 if(mode==='inspired')await expect(contact.locator('footer')).toHaveCSS('color','rgb(248, 248, 248)');
 expect(extractions).toBe(1);expect(generations).toBe(1);
});
test('an explicit Professional services industry remains a valid scratch brief',async({page})=>{
 let generations=0,recognitions=0;
 await page.route('**/api/business/recognize',route=>{recognitions++;return route.abort()});
 await page.route('**/api/business/visuals',route=>route.fulfill({status:200,json:{assets:[]}}));
 await page.route('**/api/ai/business',route=>{generations++;const input=route.request().postDataJSON();expect(input.industry).toBe('Professional services');expect(input.services).toEqual(['Business consulting','Project support']);return route.fulfill({status:200,json:{pages:generateBusinessWebsite(input).pages}})});
 await page.goto('/business');await page.getByRole('button',{name:/^Standard website/}).click();await page.getByPlaceholder('e.g. Northstar Coffee').fill('Harbor Advisory');
 await page.getByPlaceholder(/Describe what you offer/).fill('Industry: Professional services\nOfferings: Business consulting, Project support\nWe help small businesses plan and deliver their projects.');
 await page.getByRole('button',{name:/generate my website/i}).click();await expect(page.frameLocator('iframe[title="Website preview: Home"]').locator('main h1')).toHaveText('Harbor Advisory');expect(generations).toBe(1);expect(recognitions).toBe(0);
});


test('preserve mode can reuse same-site browser-observed palette and font after user review',async({page})=>{
 await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:extracted}));
 await mockGeneration(page);
 await page.goto('/business');
 await page.getByRole('button',{name:/^Standard website/}).click();
 await page.getByRole('combobox',{name:/^Design approach/}).selectOption('inspired');
 await page.getByPlaceholder('e.g. disney.com').fill('reference.example');
 await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
 await expect(page.getByText(/Website extracted: reference\.example\. Ready to generate/)).toBeVisible();
 await page.getByText('Import optional browser-verification evidence').click();
 const captured={
  version:1,sourceUrl:'https://reference.example/',capturedAt:'2026-11-11T01:00:00Z',viewport:{width:1280,height:800},
  pages:[{path:'/',title:'Harbor Coffee',landmarks:[],interactions:[],designTokens:{backgroundColor:'rgb(20, 34, 48)',textColor:'rgb(255, 255, 255)',fontFamily:'Verdana, sans-serif',headingFontFamily:'Georgia, serif',headingFontSize:'48px',baseFontSize:'16px'}}],
  warnings:[]
 };
 await page.getByRole('textbox',{name:'Browser verification JSON'}).fill(JSON.stringify(captured));
 await page.getByRole('button',{name:'Review browser evidence'}).click();
 await page.getByRole('button',{name:/generate my website/i}).click();
 const home=page.frameLocator('iframe[title="Website preview: Home"]');
 await expect(home.locator('main h1')).toHaveText('Harbor Coffee');
 await expect(home.locator('body')).toHaveCSS('background-color','rgb(20, 34, 48)');
 await expect(home.locator('body')).toHaveCSS('font-family',/Verdana/);
 await expect(home.locator('nav img.source-brand-logo')).toHaveAttribute('src','https://reference.example/logo.png');
});
