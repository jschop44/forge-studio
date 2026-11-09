import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
for(const mode of ['standard','cinematic','object-navigation','immersive'] as const)for(const mobile of [false,true]){
 test(`${mode} preview keeps About, Contact, Home and offerings in the business (${mobile?'mobile':'desktop'})`,async({page})=>{
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:900});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https:\/\/(?:images\.unsplash\.com|dl\.polyhaven\.org)\//,route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'image/png',body:pixel}));
  await page.route('**/api/ai/business',async route=>{const input=route.request().postDataJSON();expect(input.experienceStyle).toBe(mode);return route.fulfill({status:200,json:{pages:generateBusinessWebsite(input).pages}})});
  await page.goto('/business');
  await page.getByRole('button',{name:new RegExp('^'+({'standard':'Standard website','cinematic':'Cinematic depth','object-navigation':'Interactive 3D navigation','immersive':'Full immersion'}[mode]))}).click();
  await page.getByPlaceholder('e.g. Northstar Coffee').fill('Harbor Coffee');
  await page.getByPlaceholder(/Describe what you offer/).fill('Industry: Coffee shop\nServices: Coffee beans, Ceramic mugs\nA neighborhood roastery offering coffee and handmade ceramic mugs.');
  await page.getByRole('button',{name:/generate my website/i}).click();
  const frame=(title:string)=>page.frameLocator('iframe[title="Website preview: '+title+'"]');
  const nav=(title:string)=>mode==='immersive'?frame(title).locator('[data-world-page="about"]'):frame(title).locator('body>nav').getByRole('link',{name:'About',exact:true});
  await page.locator('iframe[title="Website preview: Home"]').scrollIntoViewIfNeeded();
  const previewSize=await page.locator('iframe[title="Website preview: Home"]').boundingBox();
  expect(previewSize!.height).toBeLessThanOrEqual(page.viewportSize()!.height*.8);
  await nav('Home').click();
  await expect(frame('About').locator('main h1')).toContainText('About Harbor Coffee');
  await expect(frame('About').locator('body')).not.toContainText('AI WEBSITE BUILDER');
  expect(page.url()).toMatch(/\/business$/);
  const contact=mode==='immersive'?frame('About').locator('[data-world-page="contact"]'):frame('About').locator('body>nav').getByRole('link',{name:'Contact',exact:true});
  await contact.click();await expect(frame('Contact').locator('main h1')).toContainText('Contact');
  await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'Home',exact:true}).click();
  await expect(frame('Home').locator('main h1')).toContainText('Harbor Coffee');
  if(mode==='object-navigation'){
   await frame('Home').getByRole('link',{name:'Ceramic mugs',exact:true}).click();
   await expect(frame('Menu').locator('#offering-1')).toBeInViewport();
  }else if(mode==='immersive'){
   await frame('Home').locator('[data-world-page="services"]').click();
   await frame('Menu').getByRole('button',{name:'Read Menu page',exact:true}).click();await expect(frame('Menu').locator('main h1')).toHaveText('Menu');
  }else{
   // Root-relative links formerly escaped srcdoc and loaded a Forge route.
   await frame('Home').locator('body>nav').getByRole('link',{name:'About',exact:true}).evaluate(a=>a.setAttribute('href','/about?from=nav'));
   await nav('Home').click();await expect(frame('About').locator('main h1')).toContainText('About Harbor Coffee');
  }
  expect(errors).toEqual([]);
 });
}
