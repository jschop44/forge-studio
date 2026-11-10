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
 await expect(page.getByRole('status')).toContainText('Edited page restored');
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
 await expect(page.getByRole('alert')).toContainText('Preview blocked');
 await page.getByRole('button',{name:'Return edited page to generator'}).click();
 await expect(page).toHaveURL(/\/visual-editor$/);
 await expect(page.getByRole('status')).toContainText('Return blocked');
 await page.getByRole('textbox',{name:'HTML body'}).fill('<main><h1>Safe again</h1></main>');
 await page.getByRole('textbox',{name:'CSS',exact:true}).fill('@import url(https://example.com/x.css)');
 await expect(page.getByRole('alert')).toContainText('Preview blocked');
 await page.getByRole('button',{name:'Validate and download edited page'}).click();
 await expect(page.getByRole('status')).toContainText('Export blocked');
});
