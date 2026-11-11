import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';

for(const {mode,width} of [{mode:'inspired',width:390},{mode:'redesign',width:1280}]){
 test(`default About retains inspected source text in ${mode} at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const observed='Our studio collaborates with neighborhood businesses on accessible residential design.';
  await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:{url:'https://reference.example/',title:'Harbor Studio | Residential design',description:'An independent design practice creating residential and commercial spaces.',headings:['Residential design'],navigation:[],stylesheetsRead:1,styleFound:true,styleReference:{background:'#ffffff',fontFamily:'Georgia'},pageSummaries:[{path:'/about?lang=en',label:'About',title:'Meet Harbor Studio',description:'Our design studio',headings:['Our work'],paragraphs:[observed,observed]}]}}));
  await page.route('**/api/ai/business',route=>{const input=route.request().postDataJSON();return route.fulfill({status:200,json:{draft:input,provider:'browser-test-fixture',pages:generateBusinessWebsite(input).pages}})});
  await page.goto('/business');
  await page.getByRole('combobox',{name:/^Design approach/}).selectOption(mode);
  await page.getByPlaceholder('e.g. disney.com').fill('reference.example');
  await page.getByRole('button',{name:'Extract website appearance',exact:true}).click();
  await expect(page.getByText(/Ready to generate/)).toBeVisible();
  const tokens={backgroundColor:'#ffffff',textColor:'#111111',fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',headingFontSize:'48px',baseFontSize:'17px'};
  const capture={version:1,sourceUrl:'https://reference.example/',capturedAt:'2026-11-11T12:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{path:'/',title:'Home',landmarks:[],interactions:[],designTokens:tokens},{path:'/about?lang=en',title:'About',landmarks:[],interactions:[],designTokens:{...tokens,backgroundColor:'#ddeeff'}}]};
  await page.getByText('Import optional browser-verification evidence',{exact:true}).click();
  await page.getByRole('textbox',{name:'Browser verification JSON'}).fill(JSON.stringify(capture));
  await page.getByRole('button',{name:'Review browser evidence'}).click();
  await expect(page.getByRole('button',{name:'Preview captured layout (review only)'})).toBeVisible();
  await page.getByRole('button',{name:/generate my website/i}).click();
  await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'About',exact:true}).click();
  const about=page.frameLocator('iframe[title="Website preview: About"]');
  await expect(about.getByText(observed,{exact:true})).toHaveCount(1);
  await expect(about.getByText(observed,{exact:true})).toBeVisible();
  await expect(about.getByRole('link',{name:'View original page',exact:true})).toHaveAttribute('href','https://reference.example/about?lang=en');
  await expect(about.locator('form')).toHaveCount(0);
  if(mode==='inspired')await expect(about.locator('body')).toHaveCSS('background-color','rgb(221, 238, 255)');
  else await expect(about.locator('body')).not.toHaveCSS('background-color','rgb(221, 238, 255)');
 });
}
