import {test,expect,type Page} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';
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
 await page.getByRole('button',{name:/^3D immersion/}).click();
 await page.getByRole('button',{name:/generate my website/i}).click();
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Portfolio',exact:true}).click();
 const frame=page.frameLocator('iframe[title="Website preview: Portfolio"]');
 await expect(frame.locator('#forge-immersive-world')).toBeVisible();
 await frame.getByRole('button',{name:'Read Portfolio page',exact:true}).click();
 await expect(frame.getByRole('heading',{name:'Harbor projects'})).toBeVisible();
 await expect(frame.locator('body')).toHaveCSS('background-color','rgb(17, 34, 51)');
});


test('images inspected on a product subpage survive extraction and reach matching generated offerings',async({page})=>{
 const homepage=extractWebsiteDesignDna('<img src="/brand-logo.png" alt="Harbor Wings logo">','https://reference.example/');
 const offerings=extractWebsiteDesignDna('<img src="/wings.jpg" alt="Chicken wings"><img src="/pizza.jpg" alt="Pizza">','https://reference.example/offerings');
 await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:{
  ...extracted,title:'Harbor Wings | Restaurant',
  description:'Restaurant serving chicken wings and fresh pizza.',
  headings:['Chicken wings','Pizza'],designDna:homepage,
  pageSummaries:[{path:'/offerings',label:'Specialties',title:'Our specialties',description:'Chicken wings and pizza',headings:['Chicken wings','Pizza'],paragraphs:[],images:offerings.images}]
 }}));
 await generationFixture(page);
 await openExtraction(page);
 await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
 await expect(page.getByText(/Website extracted: reference\.example\. Ready to generate/)).toBeVisible();
 await page.getByPlaceholder('Describe what you offer, who you serve and what makes you different.').fill('Industry: Restaurant\nOfferings: Chicken wings, Pizza\nFreshly prepared neighborhood meals.');
 await page.getByRole('button',{name:/generate my website/i}).click();
 const nav=page.getByRole('navigation',{name:'Website pages'});
 await expect(nav).toBeVisible();
 await nav.getByRole('button',{name:'Menu',exact:true}).click();
 const menu=page.frameLocator('iframe[title="Website preview: Menu"]');
 await expect(menu.locator('#offering-0 img[data-forge-source-image]')).toHaveAttribute('src','https://reference.example/wings.jpg');
 await expect(menu.locator('#offering-1 img[data-forge-source-image]')).toHaveAttribute('src','https://reference.example/pizza.jpg');
 await expect(menu.locator('nav img.source-brand-logo')).toHaveAttribute('src','https://reference.example/brand-logo.png');
});


test('authorized computed browser colors and fonts reach preserve preview, not the redesign mode',async({page})=>{
 await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:extracted}));
 await generationFixture(page);
 await openExtraction(page);
 await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
 const browserCapture={version:1,sourceUrl:'https://reference.example/',capturedAt:'2026-11-10T18:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{
  path:'/',title:'Harbor Studio',landmarks:[],interactions:[],designTokens:{
   backgroundColor:'rgb(240, 233, 220)',textColor:'rgb(20, 30, 40)',fontFamily:'"Avenir Next", Arial',headingFontFamily:'Georgia',headingFontSize:'66px',baseFontSize:'17px'
  }
 }]};
 await page.getByText('Import optional browser-verification evidence',{exact:true}).click();
 await page.getByRole('textbox',{name:'Browser verification JSON'}).fill(JSON.stringify(browserCapture));
 await page.getByRole('button',{name:'Review browser evidence'}).click();
 await expect(page.getByRole('button',{name:'Preview captured layout (review only)'})).toBeVisible();
 await page.getByRole('button',{name:/generate my website/i}).click();
 const home=page.frameLocator('iframe[title="Website preview: Home"]');
 await expect(home.locator('body')).toHaveCSS('background-color','rgb(240, 233, 220)');
 await expect(home.locator('body')).toHaveCSS('font-family',/Avenir Next/);
 await expect(home.locator('h1')).toHaveCSS('font-family',/Georgia/);
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Contact',exact:true}).click();
 const contact=page.frameLocator('iframe[title="Website preview: Contact"]');
 await expect(contact.locator('body')).toHaveCSS('background-color','rgb(240, 233, 220)');
});
