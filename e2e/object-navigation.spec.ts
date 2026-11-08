import {test,expect,type Page} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const coffee={businessName:'Northstar Coffee',industry:'Coffee shop',description:'An independent coffee shop offering coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs'],experienceStyle:'object-navigation'};
async function fixture(page:Page,brief=coffee){
 const pages=generateBusinessWebsite(brief).pages;
 await page.route('https://objects.test/**',route=>{const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';return route.fulfill({status:200,contentType:'text/html',body:pages.find(p=>p.slug===slug)?.html||'Missing fixture'})});
 await page.goto('https://objects.test/index.html');
 await expect(page.locator('[data-object-navigation] canvas')).toBeVisible();
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
 await page.goto('/business');await expect(page.getByLabel('Website experience',{exact:true})).toHaveValue('standard');
 await page.getByPlaceholder('e.g. Northstar Coffee').fill('Northstar Coffee');
 await page.getByRole('button',{name:/generate my website/i}).click();
 const frame=page.frameLocator('iframe[title="Website preview: Home"]');
 await expect(frame.locator('h1')).toContainText('Northstar Coffee');
 await expect(frame.locator('[data-object-navigation]')).toHaveCount(0);
 await expect(frame.locator('#forge-webgl-atmosphere')).toHaveCount(0);
});
