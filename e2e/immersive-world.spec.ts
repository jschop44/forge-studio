import {test,expect,type Page} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const brief={businessName:'Harbor Coffee',industry:'Coffee shop',description:'An independent cafe offering coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs','Community events'],experienceStyle:'immersive'};
for(const width of [390,1440])test('uncommon niche keeps an interactive content exhibition and correct pages at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:900});
 const site=generateBusinessWebsite({businessName:'Meridian Horology',industry:'Clock restoration',description:'Restoration of antique clocks and mechanical timepieces.',services:['Clock restoration','Mechanical servicing'],experienceStyle:'immersive'});
 await page.route('https://content.test/**',route=>{const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';return route.fulfill({status:200,contentType:'text/html',body:site.pages.find(p=>p.slug===slug)?.html||''});});
 await page.goto('https://content.test/index.html');
 const world=page.locator('#forge-immersive-world'),stage=page.locator('[data-content-stage]');
 await expect(world).toHaveAttribute('data-loaded','true');await expect(world).toHaveAttribute('data-environment','content-exhibition');
 await stage.focus();await page.keyboard.press('ArrowRight');
 const cardTransforms=await stage.locator('[data-content-card]').evaluateAll(cards=>cards.map(card=>(card as HTMLElement).style.transform));
 expect(cardTransforms.every(transform=>!transform.includes('rotateY('))).toBe(true);
 await expect(page.locator('[data-content-card]:not([inert]) h2')).toContainText('Services');
 await page.getByRole('link',{name:'Open Services',exact:false}).click();await expect(page).toHaveURL(/services\.html$/);
 await expect(page.locator('[data-content-card]:not([inert]) h2')).toContainText('Services');
 await page.getByRole('button',{name:'Read this page',exact:true}).click();await expect(page.locator('main h1')).toContainText('Services');
 await page.getByRole('button',{name:'Return to 3D exhibition',exact:true}).click();await expect(stage).toBeFocused();
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);
 await test.info().attach('Meridian-content-exhibition-'+width,{body:await page.screenshot(),contentType:'image/png'});
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('[data-content-card]').first()).toHaveCSS('transition-duration','0s');
 await page.emulateMedia({media:'print'});await expect(world).toBeHidden();await expect(page.locator('main h1')).toBeVisible();
});
async function fixture(page:Page,active=true){
 const pages=generateBusinessWebsite(brief).pages;
 // Interaction tests use a deterministic texture; real imagery is captured separately.
 await page.route(/https:\/\/(?:dl\.polyhaven\.org|upload\.wikimedia\.org)\//,route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')}));
 await page.route('https://world.test/**',route=>{const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';return route.fulfill({status:200,contentType:'text/html',body:pages.find(p=>p.slug===slug)?.html||'Missing fixture'})});
 await page.goto('https://world.test/index.html');
 if(active)await expect(page.locator('#forge-immersive-world canvas')).toBeVisible();
}
for(const mobile of [false,true])test(`panoramic destinations open the right business page (${mobile?'mobile':'desktop'})`,async({page})=>{
 if(mobile)await page.setViewportSize({width:390,height:844});await fixture(page);
 await page.locator('#forge-immersive-world [data-world-page="services"]').click();await expect(page).toHaveURL(/services\.html$/);
 await page.getByRole('button',{name:'Read Menu page',exact:true}).click();await expect(page.locator('main h1')).toHaveText('Menu');await expect(page.locator('#offering-2')).toContainText('Community events');
 await page.getByRole('button',{name:'Return to environment',exact:true}).click();await expect(page.locator('#forge-immersive-world canvas')).toBeVisible();
});
test('dragging and keyboard controls rotate the environment and preserve camera state between pages',async({page})=>{
 await fixture(page);const canvas=page.locator('#forge-immersive-world canvas'),rect=(await canvas.boundingBox())!;
 await page.mouse.move(rect.x+rect.width*.8,rect.y+rect.height*.75);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.6,rect.y+rect.height*.72,{steps:5});await page.mouse.up();await expect(page).toHaveURL(/index\.html$/);
 await canvas.focus();await page.keyboard.press('ArrowRight');const saved=await page.evaluate(()=>sessionStorage.getItem('forge-panorama-camera:/:Harbor Coffee'));
 await page.locator('#forge-immersive-world [data-world-page="about"]').click();await expect(page).toHaveURL(/about\.html$/);expect(await page.evaluate(()=>sessionStorage.getItem('forge-panorama-camera:/:Harbor Coffee'))).toBe(saved);
 await page.getByRole('button',{name:'Reset world view'}).click();const reset=await page.evaluate(()=>sessionStorage.getItem('forge-panorama-camera:/:Harbor Coffee'));expect(JSON.parse(reset!)).toEqual([-1.25,0,55]);
});
test('reduced motion and keyboard destinations work, and print reveals readable content',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await fixture(page);const link=page.locator('#forge-immersive-world [data-world-page="contact"]');await link.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/contact\.html$/);
 await page.emulateMedia({media:'print'});await expect(page.locator('#forge-immersive-world')).toBeHidden();await expect(page.locator('main h1')).toBeVisible();
});
test('WebGL failure and context loss restore the ordinary business pages',async({page})=>{
 await fixture(page);await page.locator('#forge-immersive-world canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(page.locator('#forge-immersive-world')).toBeHidden();await expect(page.locator('main h1')).toBeVisible();
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null});await page.goto('https://world.test/services.html');await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('#forge-immersive-world')).toBeHidden();
});
test('builder keeps extracted destinations inside the business environment',async({page})=>{
 await page.route(/https:\/\/dl\.polyhaven\.org\//,route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')}));
 await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:{url:'https://reference.example',title:'Harbor Coffee',description:brief.description,headings:brief.services,styleReference:{},pageSummaries:[{path:'/events',label:'Events',title:'Community events',description:'Coffee and conversations.',headings:['Events']}]}}));
 await page.route('**/api/ai/business',async route=>{const input=route.request().postDataJSON();expect(input.experienceStyle).toBe('immersive');await route.fulfill({status:200,json:{pages:generateBusinessWebsite(input).pages}})});
 await page.goto('/business');await page.getByRole('button',{name:/^3D immersion/}).click();await page.getByRole('combobox',{name:/^Design approach/}).selectOption('redesign');await page.getByPlaceholder('e.g. disney.com').fill('reference.example');await page.getByRole('button',{name:/generate my website/i}).click();
 await page.locator('iframe[title="Website preview: Home"]').scrollIntoViewIfNeeded();const home=page.frameLocator('iframe[title="Website preview: Home"]');await expect(home.locator('#forge-immersive-world')).toBeVisible();await home.locator('[data-world-page="events"]').click();
 const events=page.frameLocator('iframe[title="Website preview: Events"]');await expect(events.locator('#forge-immersive-world')).toBeVisible();await events.getByRole('button',{name:'Read Events page',exact:true}).click();await expect(events.getByRole('heading',{name:'Community events',exact:true})).toBeVisible();
});
