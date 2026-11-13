import {test,expect} from '@playwright/test';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';

const tokens={
 backgroundColor:'rgb(250, 245, 231)',textColor:'rgb(28, 42, 36)',
 fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',
 headingFontSize:'52px',baseFontSize:'16px',
 headerPaddingTop:'24px',headerPaddingBottom:'20px',
 heroGap:'48px',heroPaddingTop:'88px',heroPaddingBottom:'72px',
 heroMediaRadius:'26px'
};
const capture={
 version:1,sourceUrl:'https://source-store.example/',capturedAt:'2026-11-13T00:00:00Z',
 viewport:{width:1280,height:800},warnings:[],
 pages:[{path:'/',title:'Source Store',landmarks:[],interactions:[],designTokens:tokens}]
};
const picture='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22400%22%20height=%22200%22%3E%3Crect%20width=%22400%22%20height=%22200%22%20fill=%22%23204945%22/%3E%3C/svg%3E';
const original={slug:'index',html:[
 '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>*{box-sizing:border-box}body{margin:0}nav{padding:8px 12px}main{max-width:100%;margin:auto;padding:0 16px}',
 '.site-hero,.extracted-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;padding:16px}',
 '.site-hero>*,.extracted-hero>*{min-width:0}.editorial-photo,.extracted-hero figure{margin:0}',
 'img{display:block;width:100%;height:auto}h1{overflow-wrap:anywhere}',
 '@media(max-width:700px){.site-hero,.extracted-hero{grid-template-columns:minmax(0,1fr)}}</style></head>',
 '<body><nav><a href="#main">Store</a></nav><main id="main">',
 '<section class="site-hero"><div><h1>Premium products for all sorts of active lifestyles</h1></div>',
 '<figure class="editorial-photo"><img src="'+picture+'" alt="Illustration"></figure></section>',
 '<header class="extracted-hero"><div><h1>Restored source product page</h1></div>',
 '<figure><img src="'+picture+'" alt="Source illustration"></figure></header>',
 '</main></body></html>'
].join('')};
const output=applyCapturedAppearance([original],capture,capture.sourceUrl,'preserve').pages[0].html;

for(const width of [390,1280]){
 test('preserved source rhythm keeps responsive page and image readability at '+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.setContent(output,{waitUntil:'load'});
  const nav=page.locator('body>nav'),hero=page.locator('.site-hero'),extracted=page.locator('.extracted-hero');
  await expect(hero.locator('h1')).toBeVisible();
  await expect(extracted.locator('h1')).toBeVisible();
  await expect(hero.locator('img')).toHaveCSS('border-radius','26px');
  await expect(extracted.locator('img')).toHaveCSS('border-radius','26px');
  await expect(nav).toHaveCSS('padding-top',width>700?'24px':'8px');
  await expect(hero).toHaveCSS('padding-top',width>700?'88px':'16px');
  await expect(hero).toHaveCSS('column-gap',width>700?'48px':'16px');
  await expect(extracted).toHaveCSS('column-gap',width>700?'48px':'16px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
  const image=await hero.locator('img').boundingBox();
  expect(image).not.toBeNull();
  expect(image!.width).toBeGreaterThan(100);
 });
}
