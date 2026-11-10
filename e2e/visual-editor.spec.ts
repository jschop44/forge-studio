import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';

const home={slug:'index',title:'Home',html:'<!doctype html><html><head><style>body{color:rgb(20,30,40)}</style></head><body><main><h1>Original bakery</h1></main></body></html>'};
const contact={slug:'contact',title:'Contact',html:'<!doctype html><html><head><style>body{color:blue}</style></head><body><main><h1>Contact bakery</h1></main></body></html>'};

test('generated page edits return to the generator without losing sibling pages',async({page})=>{
 await page.goto('/visual-editor');
 await page.evaluate(({home,contact})=>{
  sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(home));
  sessionStorage.setItem('forge:visual-editor:site',JSON.stringify([home,contact]));
 },{home,contact});
 await page.reload();
 await expect(page.getByRole('status')).toContainText('Generated page loaded');
 await expect(page.frameLocator('iframe[title="Edited website preview"]').locator('h1')).toHaveText('Original bakery');
 await page.getByRole('textbox',{name:'HTML body'}).fill('<main><h1>Updated bakery</h1></main>');
 await page.getByRole('textbox',{name:'CSS',exact:true}).fill('body{color:rgb(10,20,30)}');
 await expect(page.frameLocator('iframe[title="Edited website preview"]').locator('h1')).toHaveText('Updated bakery');
 await page.getByRole('button',{name:'Return edited page to generator'}).click();
 await expect(page).toHaveURL(/\/business$/);
 await expect(page.locator('p.forge-auto-status')).toContainText('Edited page restored');
 await expect(page.frameLocator('iframe[title="Website preview: Home"]').locator('h1')).toHaveText('Updated bakery');
 await page.evaluate(()=>{
  if(sessionStorage.getItem('forge:visual-editor:return')!==null)throw Error('Return handoff not cleared');
  if(sessionStorage.getItem('forge:visual-editor:site')!==null)throw Error('Site handoff not cleared');
 });
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Contact',exact:true}).click();
 await expect(page.frameLocator('iframe[title="Website preview: Contact"]').locator('h1')).toHaveText('Contact bakery');
});

test('active markup and CSS cannot be previewed or returned to generator',async({page})=>{
 await page.goto('/visual-editor');
 await page.evaluate(home=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(home)),home);
 await page.reload();
 await expect(page.getByRole('status')).toContainText('Generated page loaded');
 await page.getByRole('textbox',{name:'HTML body'}).fill('<main><iframe src="https://example.com"></iframe></main>');
 await expect(page.locator('p[role="alert"]')).toContainText('Preview blocked');
 await page.getByRole('button',{name:'Return edited page to generator'}).click();
 await expect(page).toHaveURL(/\/visual-editor$/);
 await expect(page.getByRole('status')).toContainText('Return blocked');
 await page.getByRole('textbox',{name:'HTML body'}).fill('<main><h1>Safe again</h1></main>');
 await page.getByRole('textbox',{name:'CSS',exact:true}).fill('@import url(https://example.com/x.css)');
 await expect(page.locator('p[role="alert"]')).toContainText('Preview blocked');
 await page.getByRole('button',{name:'Validate and download edited page'}).click();
 await expect(page.getByRole('status')).toContainText('Export blocked');
});

test('no-code headline and paragraph controls update the preview safely',async({page})=>{
 const initial={slug:'index',title:'Home',html:'<!doctype html><html><head><style>body{color:black}</style></head><body><main><h1>Original heading</h1><p>Original paragraph</p></main></body></html>'};
 await page.goto('/visual-editor');
 await page.evaluate(initial=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(initial)),initial);
 await page.reload();
 await expect(page.getByRole('status')).toContainText('Generated page loaded');
 await expect(page.getByRole('textbox',{name:'Visual main headline'})).toHaveValue('Original heading');
 await expect(page.getByRole('textbox',{name:'Visual first paragraph'})).toHaveValue('Original paragraph');
 await page.getByRole('textbox',{name:'Visual main headline'}).fill('New & better <bakery>');
 await page.getByRole('textbox',{name:'Visual first paragraph'}).fill('Fresh pastries daily');
 await page.getByRole('button',{name:'Apply visual text changes'}).click();
 const preview=page.frameLocator('iframe[title="Edited website preview"]');
 await expect(preview.locator('h1')).toHaveText('New & better <bakery>');
 await expect(preview.locator('p')).toHaveText('Fresh pastries daily');
 await expect(preview.locator('bakery')).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:'HTML body'})).toContainText('New &amp; better &lt;bakery&gt;');
});

test('GrapesJS designer opens with editable canvas and block palette',async({page})=>{
 const initial={slug:'index',title:'Home',html:'<!doctype html><html><head><style>body{color:black}</style></head><body><main><h1>Canvas bakery</h1><p>Fresh bread</p></main></body></html>'};
 await page.goto('/visual-editor');
 await page.evaluate(initial=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(initial)),initial);
 await page.reload();
 await page.getByRole('button',{name:'Open drag-and-drop designer'}).click();
 await expect(page.getByRole('region',{name:'Drag and drop page designer'})).toBeVisible();
 await expect(page.locator('#forge-grapes-blocks .gjs-block')).toHaveCount(5,{timeout:20000});
 await expect(page.locator('.gjs-cv-canvas iframe')).toBeVisible();
 await page.getByRole('button',{name:'Close drag-and-drop designer'}).click();
 await expect(page.getByRole('region',{name:'Drag and drop page designer'})).toHaveCount(0);
});

test('Forge designer drag-and-drop reliably inserts a heading into the website',async({page})=>{
 const initial={slug:'index',title:'Home',html:'<!doctype html><html><head><style>body{color:black}</style></head><body><main><h1>Canvas bakery</h1></main></body></html>'};
 await page.goto('/visual-editor');
 await page.evaluate(initial=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(initial)),initial);
 await page.reload();
 await page.getByRole('button',{name:'Open drag-and-drop designer'}).click();
 const block=page.getByRole('button',{name:'Insert heading block'});
 const target=page.getByRole('region',{name:'Drop new content into page'});
 await expect(block).toBeEnabled();
 await expect(target).toBeVisible();
 await block.dragTo(target);
 const frame=page.frameLocator('.gjs-cv-canvas iframe');
 await expect(frame.locator('h2')).toContainText('New heading',{timeout:10000});
 await expect(page.getByRole('textbox',{name:'HTML body'})).toContainText('New heading');
});

test('canvas Add button supports undo and redo while synchronizing the HTML editor',async({page})=>{
 const initial={slug:'index',title:'Home',html:'<!doctype html><html><body><main><h1>Bakery</h1></main></body></html>'};
 await page.goto('/visual-editor');
 await page.evaluate(initial=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(initial)),initial);
 await page.reload();
 await page.getByRole('button',{name:'Open drag-and-drop designer'}).click();
 const insert=page.getByRole('button',{name:'Insert paragraph block'});
 await expect(insert).toBeEnabled();
 await insert.click();
 const frame=page.frameLocator('.gjs-cv-canvas iframe');
 await expect(frame.locator('p')).toHaveText('New paragraph');
 await expect(page.getByRole('textbox',{name:'HTML body'})).toContainText('New paragraph');
 await page.getByRole('button',{name:'Undo canvas edit'}).click();
 await expect(frame.locator('p')).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:'HTML body'})).not.toContainText('New paragraph');
 await page.getByRole('button',{name:'Redo canvas edit'}).click();
 await expect(frame.locator('p')).toHaveText('New paragraph');
 await expect(page.getByRole('textbox',{name:'HTML body'})).toContainText('New paragraph');
});

test('visual designer uses a single-column layout on narrow mobile screens',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const initial={slug:'index',title:'Home',html:'<!doctype html><html><body><h1>Mobile bakery</h1></body></html>'};
 await page.goto('/visual-editor');
 await page.evaluate(initial=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(initial)),initial);
 await page.reload();
 await page.getByRole('button',{name:'Open drag-and-drop designer'}).click();
 const grid=page.locator('.forge-grapes-layout');
 await expect(grid).toBeVisible();
 await expect.poll(()=>grid.evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
 await expect(page.getByRole('button',{name:'Insert heading block'})).toBeEnabled();
});

test('visual editor has polished scoped styling and no mobile horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const initial={slug:'index',title:'Home',html:'<!doctype html><html><body><h1>Accessible bakery</h1></body></html>'};
 await page.goto('/visual-editor');
 await page.evaluate(initial=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(initial)),initial);
 await page.reload();
 const editor=page.locator('main.forge-visual-editor');
 await expect(editor).toBeVisible();
 await expect.poll(()=>editor.evaluate(element=>getComputedStyle(element).backgroundImage)).toContain('linear-gradient');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 const iframe=page.frameLocator('iframe[title="Edited website preview"]');
 await expect(iframe.locator('h1')).toHaveText('Accessible bakery');
 const iframeBackground=await iframe.locator('body').evaluate(element=>getComputedStyle(element).backgroundImage);
 expect(iframeBackground).toBe('none');
});

test('download removes executable edits and includes responsive document metadata',async({page})=>{
 await page.goto('/visual-editor');
 await page.evaluate(home=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(home)),home);
 await page.reload();
 await expect(page.getByRole('status')).toContainText('Generated page loaded');
 await page.getByRole('textbox',{name:'HTML body'}).fill('<main><h1 onclick="alert(1)">Safe bakery</h1><script>alert(2)</script></main>');
 await expect(page.frameLocator('iframe[title="Edited website preview"]').locator('h1')).toHaveText('Safe bakery');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Validate and download edited page'}).click();
 const download=await downloadPromise;
 const stream=await download.createReadStream();
 if(!stream)throw Error('Missing exported document');
 let html='';for await(const chunk of stream)html+=chunk.toString();
 expect(html).toContain('<h1>Safe bakery</h1>');
 expect(html).not.toMatch(/<script|onclick/i);
 expect(html).toContain('name="viewport"');
});

test('device previews use real responsive viewports without changing page content',async({page})=>{
 const initial={slug:'index',title:'Home',html:'<!doctype html><html><head><style>.responsive-proof{color:rgb(255,0,0)}@media(max-width:800px){.responsive-proof{color:rgb(0,128,0)}}@media(max-width:400px){.responsive-proof{color:rgb(0,0,255)}}</style></head><body><h1 class="responsive-proof">Responsive bakery</h1></body></html>'};
 await page.goto('/visual-editor');
 await page.evaluate(initial=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(initial)),initial);
 await page.reload();
 await page.getByRole('button',{name:'Open drag-and-drop designer',exact:true}).click();
 const frame=page.frameLocator('.gjs-cv-canvas iframe');
 const mobile=page.getByRole('button',{name:'Mobile canvas preview',exact:true});
 await expect(mobile).toBeEnabled();
 await expect(frame.locator('h1')).toHaveText('Responsive bakery');
 await mobile.click();
 await expect(mobile).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>frame.locator('html').evaluate(()=>window.innerWidth)).toBe(390);
 await expect(frame.locator('h1')).toHaveCSS('color','rgb(0, 0, 255)');
 await page.getByRole('button',{name:'Tablet canvas preview',exact:true}).click();
 await expect.poll(()=>frame.locator('html').evaluate(()=>window.innerWidth)).toBe(768);
 await expect(frame.locator('h1')).toHaveCSS('color','rgb(0, 128, 0)');
 await page.getByRole('button',{name:'Desktop canvas preview',exact:true}).click();
 await expect(page.getByRole('button',{name:'Desktop canvas preview',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>frame.locator('html').evaluate(()=>window.innerWidth)).toBe(1280);
 await expect(frame.locator('h1')).toHaveCSS('color','rgb(255, 0, 0)');
 await expect(frame.locator('h1')).toHaveText('Responsive bakery');
});


test('business setup and selected design survive an actual generator-editor round trip',async({page})=>{
 const brief='Industry: Coffee roastery\nProducts: Coffee beans, Ceramic mugs\nWe roast fresh coffee and sell handcrafted ceramic mugs.';
 await page.route('**/api/ai/business',route=>{const input=route.request().postDataJSON();return route.fulfill({status:200,json:{provider:'fixture',pages:generateBusinessWebsite(input).pages}})});
 await page.goto('/business');
 await page.getByRole('textbox',{name:'Business name',exact:true}).fill('Harbor Roastery');
 await page.getByPlaceholder(/Describe what you offer/).fill(brief);
 await page.getByLabel('Design selection',{exact:true}).selectOption('library');
 await page.getByLabel('Design pattern',{exact:true}).selectOption('hospitality-story');
 await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.frameLocator('iframe[title="Website preview: Home"]').locator('main h1')).toHaveText('Harbor Roastery');
 await page.getByRole('checkbox',{name:/I reviewed every generated page/}).check();
 await page.locator('summary').filter({hasText:'Advanced editing and intelligence tools'}).click();
 await page.getByRole('button',{name:'Edit current generated page',exact:true}).click();
 await expect(page).toHaveURL(/\/visual-editor$/);
 await page.getByRole('textbox',{name:'Visual main headline',exact:true}).fill('Roasted by the harbor');
 await page.getByRole('button',{name:'Apply visual text changes',exact:true}).click();
 await page.getByRole('button',{name:'Return edited page to generator',exact:true}).click();
 await expect(page).toHaveURL(/\/business$/);
 await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveValue('Harbor Roastery');
 await expect(page.getByPlaceholder(/Describe what you offer/)).toHaveValue(brief);
 await expect(page.getByLabel('Design selection',{exact:true})).toHaveValue('library');
 await expect(page.getByLabel('Design pattern',{exact:true})).toHaveValue('hospitality-story');
 await expect(page.getByRole('checkbox',{name:/I reviewed every generated page/})).not.toBeChecked();
 await expect(page.frameLocator('iframe[title="Website preview: Home"]').locator('main h1')).toHaveText('Roasted by the harbor');
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Contact',exact:true}).click();
 await expect(page.frameLocator('iframe[title="Website preview: Contact"]').locator('main h1')).toHaveText('Contact us');
 expect(await page.evaluate(()=>sessionStorage.getItem('forge:visual-editor:context'))).toBeNull();
});
