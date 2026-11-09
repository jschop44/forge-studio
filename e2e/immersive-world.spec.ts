import {test,expect,type Page} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const brief={businessName:'Harbor Coffee',industry:'Coffee shop',description:'An independent cafe offering coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs','Community events'],experienceStyle:'immersive'};
async function fixture(page:Page,options={...brief},active=true){
 const pages=generateBusinessWebsite(options).pages;
 await page.route('https://world.test/**',route=>{const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';return route.fulfill({status:200,contentType:'text/html',body:pages.find(p=>p.slug===slug)?.html||'Missing fixture'})});
 await page.goto('https://world.test/index.html');
 if(active)await expect(page.locator('#forge-immersive-world canvas')).toBeVisible();
}
async function landmarkPoint(page:Page,index:number){
 return page.locator('#forge-immersive-world canvas').evaluate((canvas,index)=>{
  const rect=canvas.getBoundingClientRect(),aspect=rect.width/rect.height,fit=Math.min(1,aspect*.95),pitch=.35;
  const x=(index-1.5)*2.5,z=2+Math.abs(x)*.09+.275,y=.95-1;
  const p=[x*fit,1+(y*Math.cos(pitch)-z*Math.sin(pitch))*fit,(y*Math.sin(pitch)+z*Math.cos(pitch))*fit];
  return {x:rect.left+(p[0]*2.2/aspect/(12-p[2])*.5+.5)*rect.width,y:rect.top+(.5-(p[1]-1)*2.2/(12-p[2])*.5)*rect.height};
 },index);
}
for(const mobile of [false,true])test(`full world mesh opens its page destination (${mobile?'mobile':'desktop'})`,async({page})=>{
 if(mobile)await page.setViewportSize({width:390,height:844});
 await fixture(page);await page.getByRole('button',{name:'Reset world view'}).click();
 await test.info().attach(mobile?'immersive-mobile':'immersive-desktop',{body:await page.screenshot(),contentType:'image/png'});
 const point=await landmarkPoint(page,1);await page.mouse.click(point.x,point.y);
 await expect(page).toHaveURL(/services\.html$/);
 await expect(page.locator('#forge-immersive-world [data-world-page="services"]')).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:'Read Menu page',exact:true}).click();
 await expect(page.locator('main h1')).toHaveText('Menu');
 await expect(page.locator('#offering-2')).toContainText('Community events');
 await page.getByRole('button',{name:'Explore 3D world',exact:true}).click();await expect(page.locator('#forge-immersive-world canvas')).toBeVisible();
});
test('dragging and keyboard orbit do not activate page landmarks, and camera persists across pages',async({page})=>{
 await fixture(page);const point=await landmarkPoint(page,1);
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+60,point.y+10,{steps:6});await page.mouse.up();
 await expect(page).toHaveURL(/index\.html$/);
 const canvas=page.locator('#forge-immersive-world canvas');await canvas.focus();await page.keyboard.press('ArrowRight');
 const saved=await page.evaluate(()=>sessionStorage.getItem('forge-immersive-camera:/:Harbor Coffee'));
 await page.locator('#forge-immersive-world [data-world-page="about"]').click();
 await expect(page).toHaveURL(/about\.html$/);
 expect(await page.evaluate(()=>sessionStorage.getItem('forge-immersive-camera:/:Harbor Coffee'))).toBe(saved);
 await page.getByRole('button',{name:'Reset world view'}).click();
 const reset=await page.evaluate(()=>sessionStorage.getItem('forge-immersive-camera:/:Harbor Coffee'));
 expect(JSON.parse(reset!)).toEqual([0,.35,1]);
});
test('reduced motion and keyboard page links work, and printing exposes the page content',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await fixture(page);
 const link=page.locator('#forge-immersive-world [data-world-page="contact"]');await link.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/contact\.html$/);
 await page.emulateMedia({media:'print'});await expect(page.locator('#forge-immersive-world')).toBeHidden();await expect(page.locator('main h1')).toBeVisible();
});
test('WebGL unavailability and context loss restore readable pages with ordinary navigation',async({page})=>{
 await fixture(page);
 await page.locator('#forge-immersive-world canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(page.locator('#forge-immersive-world')).toBeHidden();await expect(page.locator('main h1')).toBeVisible();
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null});await page.goto('https://world.test/services.html');
 await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('#forge-immersive-world')).toBeHidden();
});
test('builder exposes full immersion and carries it into core and extracted page previews',async({page})=>{
 await page.route('**/api/site-reference',route=>route.fulfill({status:200,json:{url:'https://reference.example',title:'Harbor Coffee',description:brief.description,headings:brief.services,styleReference:{},pageSummaries:[{path:'/events',label:'Events',title:'Community events',description:'Coffee and conversations.',headings:['Events']}]}}));
 await page.route('**/api/ai/business',async route=>{const input=route.request().postDataJSON();expect(input.experienceStyle).toBe('immersive');await route.fulfill({status:200,json:{pages:generateBusinessWebsite(input).pages}})});
 await page.goto('/business');await page.getByRole('button',{name:/^Full immersion/}).click();
 await page.getByRole('combobox',{name:/^Design approach/}).selectOption('redesign');await page.getByPlaceholder('e.g. disney.com').fill('reference.example');
 await page.getByRole('button',{name:/generate my website/i}).click();
 const frame=page.frameLocator('iframe[title="Website preview: Home"]');
 await expect(frame.locator('#forge-immersive-world')).toBeVisible();await frame.locator('[data-world-page="events"]').click();
 const events=page.frameLocator('iframe[title="Website preview: Events"]');await expect(events.locator('#forge-immersive-world')).toBeVisible();
 await events.getByRole('button',{name:'Read Events page',exact:true}).click();await expect(events.getByRole('heading',{name:'Community events',exact:true})).toBeVisible();
});
