import {test,expect,type Page} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const extracted={url:'https://reference.example/',title:'Harbor Studio | Residential design',description:'An independent design practice creating residential and commercial spaces.',headings:['Residential design','Commercial design'],navigation:[],pageSummaries:[],stylesheetsRead:1,styleFound:true,styleReference:{background:'#112233',accent:'#d4b891',fontFamily:'Georgia'},notice:'Public website metadata.'};
async function openExtraction(page:Page){
 await page.goto('/business');
 await page.getByRole('combobox',{name:/^Design approach/}).selectOption('inspired');
 await page.getByPlaceholder('e.g. disney.com').fill('reference.example');
}
async function generationFixture(page:Page,inspectInput?:(input:Record<string,unknown>)=>void){
 await page.route('**/api/ai/business',async route=>{const input=route.request().postDataJSON();inspectInput?.(input);await route.fulfill({status:200,json:{draft:input,provider:'browser-test-fixture',pages:generateBusinessWebsite(input).pages}})});
}
test('successful extraction survives generation and equivalent URL edits, with appearance applied across pages',async({page})=>{
 let extractions=0,generations=0;
 await page.route('**/api/site-reference',async route=>{extractions++;await route.fulfill({status:200,json:extracted})});
 await generationFixture(page,input=>{generations++;expect(input.designMode).toBe('inspired');expect(input.businessName).toBe('Harbor Studio');expect(input.styleReference).toEqual(extracted.styleReference)});
 await openExtraction(page);await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
 await expect(page.getByText(/Website extracted: reference\.example\. Ready to generate/)).toBeVisible();
 await page.getByPlaceholder('e.g. disney.com').fill('https://REFERENCE.example/#top');
 await page.getByRole('button',{name:/generate my website/i}).click();
 const home=page.frameLocator('iframe[title="Website preview: Home"]');await expect(home.getByRole('heading',{name:'Harbor Studio',exact:true})).toBeVisible();
 await expect(home.locator('body')).toHaveCSS('background-color','rgb(17, 34, 51)');await expect(home.locator('body')).toHaveCSS('font-family',/Georgia/);
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Contact',exact:true}).click();
 const contact=page.frameLocator('iframe[title="Website preview: Contact"]');await expect(contact.locator('body')).toHaveCSS('background-color','rgb(17, 34, 51)');
 expect(extractions).toBe(1);expect(generations).toBe(1);
});
test('generation waits for extraction rather than treating an in-flight click as missing extraction',async({page})=>{
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/api/site-reference',async route=>{await pending;await route.fulfill({status:200,json:extracted})});
 await generationFixture(page);await openExtraction(page);
 await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
 await expect(page.locator('.forge-auto-cta')).toBeDisabled();await expect(page.locator('.forge-auto-cta')).toContainText('Reading website');
 release();await expect(page.getByText(/Website extracted: reference\.example\. Ready to generate/)).toBeVisible();
 await page.getByRole('button',{name:/generate my website/i}).click();await expect(page.getByRole('navigation',{name:'Website pages'})).toBeVisible();
 await expect(page.getByText(/Click Extract website appearance\/details before generating/)).toHaveCount(0);
});
test('Generate can complete extraction itself and use the returned facts without waiting for a React state round trip',async({page})=>{
 let requests=0;
 await page.route('**/api/site-reference',async route=>{requests++;await route.fulfill({status:200,json:extracted})});
 await generationFixture(page,input=>expect(input.businessName).toBe('Harbor Studio'));
 await openExtraction(page);await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.getByRole('navigation',{name:'Website pages'})).toBeVisible();expect(requests).toBe(1);
});
test('a failed extraction stays visible and is never replaced by misleading extract-first guidance',async({page})=>{
 let generations=0;
 await page.route('**/api/site-reference',route=>route.fulfill({status:422,json:{error:'Website returned status 403'}}));
 await page.route('**/api/ai/business',route=>{generations++;return route.abort()});
 await openExtraction(page);await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Website extraction failed:'})).toContainText('Website extraction failed: Website returned status 403');
 await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.getByRole('alert').filter({hasText:'Website extraction failed:'})).toContainText('Website extraction failed: Website returned status 403');
 await expect(page.locator('.forge-auto-cta')).toBeEnabled();expect(generations).toBe(0);
 await expect(page.getByText(/Click Extract website appearance\/details before generating/)).toHaveCount(0);
});

test('a changed source cannot receive the previous website generation result',async({page})=>{
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:extracted}));
 await page.route('**/api/ai/business',async route=>{const input=route.request().postDataJSON();await pending;await route.fulfill({status:200,json:{pages:generateBusinessWebsite(input).pages}})});
 await openExtraction(page);await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
 await expect(page.getByText(/Ready to generate/)).toBeVisible();
 await page.getByRole('button',{name:/generate my website/i}).click();
 await page.getByPlaceholder('e.g. disney.com').fill('another.example');release();
 await expect(page.getByText('Website address changed during generation. Generate again using the current website.',{exact:true})).toBeVisible();
 await expect(page.locator('iframe[title^="Website preview:"]')).toHaveCount(0);
});

test('extracted extra pages retain appearance and full-site immersive controls',async({page})=>{
 await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:{...extracted,title:'Harbor Coffee',description:'A neighborhood coffee shop selling roasted coffee beans and ceramic mugs.',headings:['Coffee beans','Ceramic mugs'],pageSummaries:[{path:'/portfolio',label:'Portfolio',title:'Harbor projects',description:'Residential interiors designed around you.',headings:['Selected projects']}]}}));
 await generationFixture(page);await openExtraction(page);
 await page.getByRole('button',{name:/Interactive 3D navigation/}).click();
 await page.getByRole('button',{name:/generate my website/i}).click();
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Portfolio',exact:true}).click();
 const frame=page.frameLocator('iframe[title="Website preview: Portfolio"]');
 await expect(frame.getByRole('heading',{name:'Harbor projects'})).toBeVisible();
 await expect(frame.locator('[data-object-navigation]')).toBeVisible();
 await expect(frame.locator('a[href="services.html#offering-0"]')).toHaveCount(1);
 await expect(frame.locator('body')).toHaveCSS('background-color','rgb(17, 34, 51)');
});
