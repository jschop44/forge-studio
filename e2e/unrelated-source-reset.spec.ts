import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';

const sourceUrl='https://disney.example/';
const sourceDesign=extractWebsiteDesignDna(
 '<meta property="og:site_name" content="Disney Home"><header><img src="/disney-logo.png" alt="Disney Home logo"></header><a href="mailto:hello@disney.example">Contact Disney</a><style>body{background:#110011;color:#fff}</style>',sourceUrl
);
const inspected={url:sourceUrl,title:'Disney Home | Official Website',
 description:'Disney Home family entertainment and theme park experiences.',
 headings:['Disney experiences','Disney news'],
 pageSummaries:[{path:'/magic',label:'Disney magic',title:'Disney magic',description:'The Disney parks',headings:['Disney parks']}],
 stylesheetsRead:1,styleFound:true,styleReference:{background:'#110011',accent:'#ffaaee'},
 designDna:sourceDesign};

for(const mode of ['inspired','redesign'] as const)
for(const [businessName,industry,services] of [
 ['Fruit stand','Fresh produce retail',['Fresh fruit','Fruit baskets']],
 ['Baseball','Baseball equipment store',['Baseball bats','Baseball gloves']]
] as const){
 test('after inspecting Disney, generate '+businessName+' as a fresh website in '+mode+' mode',async({page})=>{
  let generations=0,extractions=0;
  const sent:Record<string,unknown>[]=[];
  await page.route('**/api/site-reference',route=>{extractions++;return route.fulfill({status:200,json:inspected})});
  await page.route('**/api/business/recognize',route=>route.fulfill({status:200,json:{status:'identified',industry,services:[...services],evidence:['explicit business activity'],provider:'fixture'}}));
  await page.route('**/api/business/visuals',route=>route.fulfill({status:200,json:{assets:[]}}));
  await page.route('**/api/ai/business',route=>{
   generations++;
   const input=route.request().postDataJSON();
   sent.push(input);
   return route.fulfill({status:200,json:{provider:'fixture',pages:generateBusinessWebsite(input).pages}});
  });
  await page.goto('/business');
  await page.getByRole('combobox',{name:/^Design approach/}).selectOption(mode);
  await page.getByPlaceholder('e.g. disney.com').fill('disney.example');
  await page.getByRole('button',{name:mode==='inspired'?'Extract website appearance':'Extract website details for redesign'}).click();
  await expect(page.locator('p.forge-auto-note').filter({hasText:/^Website extracted: disney\.example/})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveValue('Disney Home');
  await page.getByRole('textbox',{name:'Business name',exact:true}).fill(businessName);
  await page.getByRole('textbox',{name:/What does your business do/}).fill(businessName);
  await expect(page.getByText(/This is a different business from Disney Home/)).toBeVisible();
  await page.getByRole('button',{name:/generate my website/i}).click();
  const home=page.frameLocator('iframe[title="Website preview: Home"]');
  await expect(home.locator('main h1')).toContainText(businessName);
  await expect(page.getByRole('combobox',{name:/^Design approach/})).toHaveValue('new');
  await expect(page.getByText(/A previous inspection of Disney Home was excluded/)).toBeVisible();
  await expect(home.locator('.source-brand-logo')).toHaveCount(0);
  await expect(home.locator('body')).not.toContainText('Disney Home');
  await expect(page.getByRole('navigation',{name:'Website pages'})).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0].designMode).toBe('new');
  expect(sent[0].businessName).toBe(businessName);
  expect(sent[0].industry).toBe(industry);
  expect(sent[0].styleReference).toBeUndefined();
  expect(sent[0].contactEmail).toBeUndefined();
  expect(JSON.stringify(sent[0])).not.toMatch(/disney/i);
  expect(generations).toBe(1);
  expect(extractions).toBe(1);
 });
}

test('changing only the name also removes the previous extracted description and contact details',async({page})=>{
 await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:inspected}));
 await page.route('**/api/business/recognize',route=>route.fulfill({status:200,json:{status:'identified',industry:'Fresh produce retail',services:['Fresh fruit'],evidence:['fruit stand'],provider:'fixture'}}));
 let sent:Record<string,unknown>|null=null;
 await page.route('**/api/business/visuals',route=>route.fulfill({status:200,json:{assets:[]}}));
 await page.route('**/api/ai/business',route=>{sent=route.request().postDataJSON();return route.fulfill({status:200,json:{pages:generateBusinessWebsite(sent!).pages}})});
 await page.goto('/business');
 await page.getByRole('combobox',{name:/^Design approach/}).selectOption('redesign');
 await page.getByPlaceholder('e.g. disney.com').fill('disney.example');
 await page.getByRole('button',{name:'Extract website details for redesign'}).click();
 await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveValue('Disney Home');
 await page.getByRole('textbox',{name:'Business name',exact:true}).fill('Fruit stand');
 // Do not change the description or the imported contact email: they are
 // still removed automatically when a different business is requested.
 await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.getByRole('navigation',{name:'Website pages'})).toBeVisible();
 expect(sent).not.toBeNull();
 expect(sent!.designMode).toBe('new');
 expect(sent!.contactEmail).toBeUndefined();
 expect(JSON.stringify(sent)).not.toMatch(/disney/i);
 await page.getByText('Add contact information (recommended before publishing)').click();
 await expect(page.getByPlaceholder('hello@yourbusiness.com')).toHaveValue('');
});
