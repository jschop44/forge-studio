import {test,expect,type Page} from '@playwright/test';
import {unzipSync,strFromU8} from 'fflate';
const wrap=(body:string)=>'<!doctype html><html><head><style>main{padding:24px}img{display:block;width:200px;height:100px}a{display:inline-block;margin:20px}</style></head><body data-forge-experience="standard">'+body+'</body></html>';
const home={slug:'index',title:'Home',html:wrap('<main><h1>Original home</h1><p>Welcome</p><a class="cta" href="index.html">Visit</a><img src="https://images.example.com/old.jpg" alt="Old photo"></main>')};
const contact={slug:'contact',title:'Contact',html:wrap('<main><h1>Original contact</h1><p>Contact us</p><a href="index.html">Home</a></main>')};
async function open(page:Page){
 await page.route('https://images.example.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="blue"/></svg>'}));
 await page.goto('/visual-editor');await page.evaluate(({home,contact})=>{sessionStorage.setItem('forge:visual-editor:handoff',JSON.stringify(home));sessionStorage.setItem('forge:visual-editor:site',JSON.stringify([home,contact]))},{home,contact});await page.reload();
 await expect(page.getByRole('status')).toContainText('Generated page loaded');
}
test('multiple pages retain independent edits, export a complete ZIP, and return together',async({page})=>{
 await open(page);
 await page.getByRole('textbox',{name:'Visual main headline',exact:true}).fill('Edited home');await page.getByRole('button',{name:'Apply visual text changes',exact:true}).click();
 await page.getByRole('combobox',{name:'Website page',exact:true}).selectOption('contact');
 await page.getByRole('textbox',{name:'Visual main headline',exact:true}).fill('Edited contact');await page.getByRole('button',{name:'Apply visual text changes',exact:true}).click();
 await page.getByRole('combobox',{name:'Website page',exact:true}).selectOption('index');
 await expect(page.frameLocator('iframe[title="Edited website preview"]').locator('h1')).toHaveText('Edited home');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Validate and download website ZIP',exact:true}).click();const download=await downloadPromise;
 const stream=await download.createReadStream();if(!stream)throw Error('Missing website ZIP');const chunks:Buffer[]=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));
 const files=unzipSync(Buffer.concat(chunks));expect(Object.keys(files).sort()).toEqual(['contact.html','index.html']);expect(strFromU8(files['index.html'])).toContain('Edited home');expect(strFromU8(files['contact.html'])).toContain('Edited contact');
 await page.getByRole('button',{name:'Return edited page to generator',exact:true}).click();await expect(page).toHaveURL(/\/business$/);
 await expect(page.frameLocator('iframe[title="Website preview: Home"]').locator('h1')).toHaveText('Edited home');
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Contact',exact:true}).click();await expect(page.frameLocator('iframe[title="Website preview: Contact"]').locator('h1')).toHaveText('Edited contact');
});
test('selected image, link, typography, layout and placement controls work without HTML editing',async({page})=>{
 await open(page);await page.getByRole('button',{name:'Open drag-and-drop designer',exact:true}).click();
 const frame=page.frameLocator('.gjs-cv-canvas iframe'),inspector=page.getByRole('region',{name:'Selected element controls',exact:true});
 await frame.locator('img').click();await inspector.getByRole('textbox',{name:'Selected image URL',exact:true}).fill('https://images.example.com/new.jpg');await inspector.getByRole('textbox',{name:'Selected image description',exact:true}).fill('New product photograph');await inspector.getByRole('button',{name:'Apply element content',exact:true}).click();
 await expect(frame.locator('img')).toHaveAttribute('src','https://images.example.com/new.jpg');await expect(frame.locator('img')).toHaveAttribute('alt','New product photograph');
 await frame.locator('a.cta').click();await inspector.getByRole('textbox',{name:'Selected link destination',exact:true}).fill('javascript:alert(1)');await inspector.getByRole('button',{name:'Apply element content',exact:true}).click();await expect(inspector.getByRole('status')).toContainText('not supported');await expect(frame.locator('a.cta')).toHaveAttribute('href','index.html');
 await inspector.getByRole('combobox',{name:'Selected link page',exact:true}).selectOption('contact.html');await inspector.getByRole('textbox',{name:'Selected element text',exact:true}).fill('Contact <team>');await inspector.getByRole('button',{name:'Apply element content',exact:true}).click();await expect(frame.locator('a.cta')).toHaveAttribute('href','contact.html');await expect(frame.locator('a.cta')).toHaveText('Contact <team>');await expect(frame.locator('team')).toHaveCount(0);
 if(await inspector.locator('details').getAttribute('open')===null)await inspector.locator('summary').click();await inspector.getByLabel('Selected text color',{exact:true}).fill('#1255aa');await inspector.getByRole('combobox',{name:'Selected font',exact:true}).selectOption('Georgia');await inspector.getByRole('spinbutton',{name:'Selected text size',exact:true}).fill('24');await inspector.getByRole('button',{name:'Apply element styles',exact:true}).click();
 await expect(frame.locator('a.cta')).toHaveCSS('color','rgb(18, 85, 170)');await expect(frame.locator('a.cta')).toHaveCSS('font-size','24px');await expect(frame.locator('a.cta')).toHaveCSS('font-family',/Georgia/);
 await page.getByRole('button',{name:'Undo canvas edit',exact:true}).click();await expect(frame.locator('a.cta')).not.toHaveCSS('font-size','24px');await page.getByRole('button',{name:'Redo canvas edit',exact:true}).click();await expect(frame.locator('a.cta')).toHaveCSS('font-size','24px');
 await frame.locator('main').click({position:{x:2,y:2}});if(await inspector.locator('details').getAttribute('open')===null)await inspector.locator('summary').click();await inspector.getByRole('combobox',{name:'Selected layout',exact:true}).selectOption('grid');await inspector.getByRole('spinbutton',{name:'Selected grid columns',exact:true}).fill('2');await inspector.getByRole('spinbutton',{name:'Selected gap',exact:true}).fill('20');await inspector.getByRole('button',{name:'Apply element styles',exact:true}).click();await expect(frame.locator('main')).toHaveCSS('display','grid');await expect(frame.locator('main')).toHaveCSS('gap','20px');
 await page.getByRole('button',{name:'Insert paragraph block',exact:true}).click();await expect(frame.locator('main > p').last()).toHaveText('New paragraph');
 await inspector.getByRole('button',{name:'Move element up',exact:true}).click();await expect.poll(()=>frame.locator('main > p').last().evaluate(element=>element.nextElementSibling?.tagName)).toBe('IMG');
 await inspector.getByRole('button',{name:'Move element down',exact:true}).click();await expect(frame.locator('main > :last-child')).toHaveText('New paragraph');
});
test('unsafe edits block page switching and broken destinations block website export',async({page})=>{
 await open(page);await page.getByRole('textbox',{name:'HTML body',exact:true}).fill('<h1>Unsafe</h1><a href="java&#115;cript:alert(1)">Click</a>');await expect(page.getByRole('alert')).toContainText('Preview blocked');
 await page.getByRole('combobox',{name:'Website page',exact:true}).selectOption('contact');await expect(page.getByRole('status')).toContainText('Page switch blocked');await expect(page.getByRole('combobox',{name:'Website page',exact:true})).toHaveValue('index');
 await page.getByRole('textbox',{name:'HTML body',exact:true}).fill('<h1>Safe content</h1><a href="missing.html">Missing page</a>');await page.getByRole('button',{name:'Validate and download website ZIP',exact:true}).click();await expect(page.getByRole('status')).toContainText('broken internal link');
});
