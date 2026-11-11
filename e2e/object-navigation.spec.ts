import {test,expect,type Page} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const coffee={businessName:'Northstar Coffee',industry:'Coffee shop',description:'An independent coffee shop offering coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs'],experienceStyle:'object-navigation'};
async function fixture(page:Page,brief=coffee,expectCanvas=true){
 const pages=generateBusinessWebsite(brief).pages;
 await page.route('https://objects.test/**',route=>{const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';return route.fulfill({status:200,contentType:'text/html',body:pages.find(p=>p.slug===slug)?.html||'Missing fixture'})});
 await page.goto('https://objects.test/index.html');
 if(brief.experienceStyle==='immersive'){
  await expect(page.locator('#forge-immersive-world')).toBeVisible();
  await page.getByRole('button',{name:'Read Home page'}).click();
  await expect(page.locator('body')).toHaveClass(/forge-world-reading/);
 }
 if(expectCanvas){await expect(page.locator('[data-object-navigation] canvas')).toBeVisible();await page.locator('[data-object-navigation] canvas').scrollIntoViewIfNeeded();}
}
async function meshPoint(page:Page,point:[number,number,number]){
 return page.locator('[data-object-navigation] canvas').evaluate((canvas,point)=>{
  const r=canvas.getBoundingClientRect(),aspect=r.width/r.height,scale=Math.min(1,aspect*.9),yaw=-.35,pitch=.4;
  const y=point[1]-.75,x=point[0]*Math.cos(yaw)+point[2]*Math.sin(yaw),z=-point[0]*Math.sin(yaw)+point[2]*Math.cos(yaw);
  const p=[x*scale,(y*Math.cos(pitch)-z*Math.sin(pitch))*scale+.75,(y*Math.sin(pitch)+z*Math.cos(pitch))*scale];
  return {x:r.left+(p[0]*2.2/aspect/(5-p[2])*.5+.5)*r.width,y:r.top+(.5-(p[1]-.75)*2.2/(5-p[2])*.5)*r.height};
 },point);
}
for(const mobile of [false,true]){
 test(`actual cup handle mesh opens drinkware (${mobile?'mobile':'desktop'})`,async({page})=>{
  if(mobile)await page.setViewportSize({width:390,height:844});
  await fixture(page);const point=await meshPoint(page,[1.57,.86,.06]);
  await page.mouse.click(point.x,point.y);
  await expect(page).toHaveURL(/services\.html#offering-1$/);
  await expect(page.locator('#offering-1')).toContainText('Ceramic mugs');
 });
}
test('actual coffee surface mesh opens beans and dragging the same mesh does not activate it',async({page})=>{
 await fixture(page);const point=await meshPoint(page,[0,1.51,0]);
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+60,point.y+15,{steps:8});await page.mouse.up();
 await expect(page).toHaveURL(/index\.html$/);
 await page.getByRole('button',{name:'Reset view'}).click();
 const coffeePoint=await meshPoint(page,[0,1.51,0]);await page.mouse.click(coffeePoint.x,coffeePoint.y);
 await expect(page).toHaveURL(/services\.html#offering-0$/);
});
test('baseball objects use baseball destinations, and keyboard links remain usable with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await fixture(page,{...coffee,businessName:'Baseball Supply',industry:'Baseball store',services:['Baseball bats','Baseballs','Gloves']});
 await expect(page.locator('[data-object-part="coffee"]')).toHaveCount(0);
 const bat=await meshPoint(page,[-.8,1.3,.1]);await page.mouse.click(bat.x,bat.y);
 await expect(page).toHaveURL(/services\.html#offering-0$/);
 await page.goto('https://objects.test/index.html');
 const glove=page.getByRole('link',{name:'Gloves',exact:true});await glove.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/services\.html#offering-2$/);
});
test('standard is the builder default and the selected experience travels with its generation request',async({page})=>{
 await page.route('**/api/ai/business',async route=>{
  const input=route.request().postDataJSON();expect(input.experienceStyle).toBe('standard');
  await route.fulfill({status:200,json:{provider:'browser-test-fixture',draft:input,pages:generateBusinessWebsite(input).pages}});
 });
 await page.goto('/business');await expect(page.getByRole('button',{name:/^Standard website/})).toHaveAttribute('aria-pressed','true');
 await page.getByPlaceholder('e.g. Northstar Coffee').fill('Northstar Coffee');
 await page.getByRole('button',{name:/generate my website/i}).click();
 const frame=page.frameLocator('iframe[title="Website preview: Home"]');
 await expect(frame.locator('h1')).toContainText('Northstar Coffee');
 await expect(frame.locator('[data-object-navigation]')).toHaveCount(0);
 await expect(frame.locator('#forge-webgl-atmosphere')).toHaveCount(0);
});

test('external model failure preserves interactive baseball geometry and navigation',async({page})=>{
 await page.route('https://dl.polyhaven.org/file/ph-assets/Models/**',route=>route.abort());
 await fixture(page,{...coffee,businessName:'Baseball Supply',industry:'Baseball store',services:['Baseball bats','Baseballs','Gloves']});
 const scene=page.locator('[data-object-navigation]');
 await expect(scene).toHaveAttribute('data-model-quality','procedural-fallback');
 await expect(scene.locator('canvas')).toBeVisible();
 await expect(page.getByRole('button',{name:'Reset view'})).toBeVisible();
 await expect(scene.getByRole('status')).toContainText('interactive 3D object');
 const bat=await meshPoint(page,[-.8,1.3,.1]);await page.mouse.click(bat.x,bat.y);
 await expect(page).toHaveURL(/services\.html#offering-0$/);
});
test('WebGL failure preserves offering navigation without unusable 3D controls',async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null});
 await fixture(page,coffee,false);
 await expect(page.locator('[data-object-navigation] canvas')).toBeHidden();
 await expect(page.getByRole('button',{name:'Reset view'})).toBeHidden();
 await page.getByRole('link',{name:'Ceramic mugs',exact:true}).click();
 await expect(page).toHaveURL(/services\.html#offering-1$/);
});
test('WebGL initialization exception keeps offering navigation accessible',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<HTMLCanvasElement['getContext']>){
   if(args[0]==='webgl')throw new Error('Simulated GPU initialization failure');
   return Reflect.apply(original,this,args);
  } as typeof HTMLCanvasElement.prototype.getContext;
 });
 await fixture(page,coffee,false);
 const scene=page.locator('[data-object-navigation]');
 await expect(scene.locator('canvas')).toBeHidden();
 await expect(scene.getByRole('status')).toContainText('Use the offering links below');
 await expect(page.getByRole('button',{name:'Reset view'})).toBeHidden();
 expect(errors).toEqual([]);
 await page.getByRole('link',{name:'Ceramic mugs',exact:true}).click();
 await expect(page).toHaveURL(/services\.html#offering-1$/);
});
test.describe('touch mesh navigation',()=>{
 test.use({hasTouch:true,viewport:{width:390,height:844}});
 test('tapping the handle opens drinkware',async({page})=>{
  await fixture(page);const point=await meshPoint(page,[1.57,.86,.06]);
  await page.touchscreen.tap(point.x,point.y);await expect(page).toHaveURL(/services\.html#offering-1$/);
 });
});

test('builder exposes one 3D immersion experience and keeps the full business range',async({page})=>{
 await page.route('**/api/ai/business',async route=>{
  const input=route.request().postDataJSON();expect(input.experienceStyle).toBe('immersive');
  expect(input.services).toEqual(['Coffee beans','Ceramic mugs','Community events']);
  await route.fulfill({status:200,json:{provider:'browser-test-fixture',draft:input,pages:generateBusinessWebsite(input).pages}});
 });
 await page.goto('/business');
 await expect(page.getByRole('button',{name:/^Interactive 3D objects/})).toHaveCount(0);
 await page.getByRole('button',{name:/^3D immersion/}).click();
 await page.getByPlaceholder('e.g. Northstar Coffee').fill('Northstar Coffee');
 await page.getByPlaceholder('Describe what you offer, who you serve and what makes you different.').fill('Industry: Coffee shop\nOfferings: Coffee beans, Ceramic mugs, Community events');
 await page.getByRole('button',{name:/generate my website/i}).click();
 await page.frameLocator('iframe[title="Website preview: Home"]').locator('[data-world-page="services"]').click();
 await page.frameLocator('iframe[title="Website preview: Menu"]').getByRole('button',{name:'Read Menu page',exact:true}).click();
 await expect(page).toHaveURL(/\/business$/);
 await expect(page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Menu',exact:true})).toHaveAttribute('aria-current','page');
 const menu=page.frameLocator('iframe[title="Website preview: Menu"]');
 await expect(menu.locator('#offering-1')).toContainText('Ceramic mugs');
 await expect(menu.locator('#offering-2')).toContainText('Community events');
});



test('immersive coffee experience exposes a clickable 3D handle alongside its panoramic world',async({page})=>{
 const immersive={...coffee,experienceStyle:'immersive'};
 await fixture(page,immersive);
 await expect(page.locator('#forge-immersive-world')).toHaveCount(1);
 await expect(page.locator('[data-object-navigation] canvas')).toBeVisible();
 const handle=await meshPoint(page,[1.57,.86,.06]);
 await page.mouse.click(handle.x,handle.y);
 await expect(page).toHaveURL(/services\.html#offering-1$/);
 await expect(page.locator('#offering-1')).toContainText('Ceramic mugs');
});

test('immersive baseball experience keeps baseball-specific mesh destinations',async({page})=>{
 await fixture(page,{...coffee,businessName:'Baseball Supply',industry:'Baseball store',services:['Baseball bats','Baseballs','Gloves'],experienceStyle:'immersive'});
 await expect(page.locator('#forge-immersive-world')).toHaveCount(1);
 await expect(page.locator('[data-object-part="coffee"]')).toHaveCount(0);
 const bat=await meshPoint(page,[-.8,1.3,.1]);
 await page.mouse.click(bat.x,bat.y);
 await expect(page).toHaveURL(/services\.html#offering-0$/);
});

test('immersive coffee handle is touch-accessible on a mobile viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await fixture(page,{...coffee,experienceStyle:'immersive'});
 const handle=await meshPoint(page,[1.57,.86,.06]);
 await page.mouse.click(handle.x,handle.y);
 await expect(page).toHaveURL(/services\.html#offering-1$/);
});

for(const mobile of [false,true]){
 test(`immersive world entry opens and focuses business-specific object (${mobile?'mobile':'desktop'})`,async({page})=>{
  if(mobile)await page.setViewportSize({width:390,height:844});
  const immersive={...coffee,experienceStyle:'immersive'};
  const pages=generateBusinessWebsite(immersive).pages;
  await page.route('https://objects.test/**',route=>{
   const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';
   return route.fulfill({status:200,contentType:'text/html',body:pages.find(p=>p.slug===slug)?.html||'Missing fixture'});
  });
  await page.goto('https://objects.test/index.html');
  const entry=page.getByRole('button',{name:'Explore interactive 3D object'});
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page.locator('body')).toHaveClass(/forge-world-reading/);
  const canvas=page.locator('[data-object-navigation] canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toBeFocused();
  const handle=await meshPoint(page,[1.57,.86,.06]);
  await page.mouse.click(handle.x,handle.y);
  await expect(page).toHaveURL(/services\.html#offering-1$/);
 });
}
