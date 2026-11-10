import {test,expect} from '@playwright/test';

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

test('GrapesJS can drag a heading block onto the website canvas',async({page})=>{
 const initial={slug:'index',title:'Home',html:'<!doctype html><html><head><style>body{color:black}</style></head><body><main><h1>Canvas bakery</h1></main></body></html>'};
 await page.goto('/visual-editor');
 await page.evaluate(initial=>sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(initial)),initial);
 await page.reload();
 await page.getByRole('button',{name:'Open drag-and-drop designer'}).click();
 const block=page.locator('#forge-grapes-blocks .gjs-block').filter({hasText:'Heading'});
 const frame=page.frameLocator('.gjs-cv-canvas iframe');
 const dropTarget=frame.locator('body');
 await expect(block).toBeVisible();
 await expect(dropTarget).toBeVisible();
 // GrapesJS accepts a drop inside its canvas iframe, not on the outer canvas wrapper.
 await block.dragTo(dropTarget,{targetPosition:{x:80,y:80}});
 await expect(frame.locator('h2')).toContainText('New heading',{timeout:10000});
});
