import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const cases=[['Horology workshop','We restore antique clocks and repair mechanical watches.','Clock restoration'],['Marine electronics','We install navigation electronics on sailboats.','Navigation installation'],['Art conservation','We conserve historic paintings and paper artworks.','Painting conservation'],['Beekeeping equipment','We supply beekeeping equipment and hive tools.','Hive tools'],['Industrial filtration','We manufacture filtration systems for industrial water.','Water filtration'],['Hospital','We provide patient care and appointment information.','Patient information'],['Restaurant','We prepare fresh meals and welcome guests for dinner.','Dinner menu']];
const modes=['standard','cinematic','object-navigation','immersive'] as const;
for(const [index,[industry,brief,offering]] of cases.entries())test('an open-ended niche reaches every generation layer: '+industry,async({page})=>{
 const mode=modes[index%modes.length];let recognition=0;
 await page.route('**/api/business/recognize',async route=>{recognition++;expect(route.request().postDataJSON().brief).toBe(brief);return route.fulfill({status:200,json:{status:'identified',industry,services:[offering],evidence:[brief],provider:'fixture'}})});
 await page.route('**/api/business/visuals',route=>route.fulfill({status:200,json:{assets:[]}}));
 await page.route('**/api/ai/business',async route=>{const input=route.request().postDataJSON();expect(input.industry).toBe(industry);expect(input.services).toEqual([offering]);expect(input.experienceStyle).toBe(mode);return route.fulfill({status:200,json:{pages:generateBusinessWebsite(input).pages}})});
 await page.goto('/business');await page.getByRole('button',{name:new RegExp('^'+(['Standard website','Cinematic depth','Interactive 3D navigation','Full immersion'][index%modes.length]))}).click();
 await page.getByPlaceholder('e.g. Northstar Coffee').fill('Meridian');await page.getByPlaceholder(/Describe what you offer/).fill(brief);await page.getByRole('button',{name:/generate my website/i}).click();
 const frame=page.frameLocator('iframe[title="Website preview: Home"]');await expect(frame.locator('main h1')).toHaveText('Meridian');
 await expect(page.getByText('Website draft generated for '+industry+'.',{exact:false})).toBeVisible();expect(recognition).toBe(1);
 await page.getByRole('navigation',{name:'Website pages'}).getByRole('button',{name:'About',exact:true}).click();
 await expect(page.frameLocator('iframe[title="Website preview: About"]').locator('main')).toContainText(offering);
});
test('ambiguous names request evidence instead of manufacturing a sector',async({page})=>{
 let generated=0;await page.route('**/api/business/recognize',route=>route.fulfill({status:200,json:{status:'needs-context',industry:'Unclear',services:[],evidence:[],provider:'fixture'}}));await page.route('**/api/ai/business',route=>{generated++;return route.abort()});
 await page.goto('/business');await page.getByPlaceholder('e.g. Northstar Coffee').fill('XQ Meridian');await page.getByRole('button',{name:/generate my website/i}).click();await expect(page.getByText(/Tell Forge what this business does/)).toBeVisible();expect(generated).toBe(0);
});
for(const industry of ['Healthcare and medical services','Restaurant and hospitality','Clock restoration'])test(industry+': the photograph moves and every destination stays fixed',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d')!;const gradient=ctx.createLinearGradient(0,0,1024,512);gradient.addColorStop(0,'#00f');gradient.addColorStop(.5,'#f00');gradient.addColorStop(1,'#0f0');ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);return c.toDataURL('image/png').split(',')[1]});
 await page.route(/https:\/\/(?:images\.unsplash\.com|dl\.polyhaven\.org)\//,route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'image/png',body:Buffer.from(png,'base64')}));
 const site=generateBusinessWebsite({businessName:'Meridian',industry,description:'Learn about our offerings and contact our team for details.',services:['Our offerings','Visitor information'],experienceStyle:'immersive',visualAssets:[{url:'https://images.unsplash.com/photo-fixture',title:industry+' visual fixture',credit:'Fixture',source:'https://unsplash.com/license',license:'CC0'}]});
 await page.route('https://scene.test/**',route=>{const slug=new URL(route.request().url()).pathname.split('/').pop()?.replace('.html','')||'index';return route.fulfill({status:200,contentType:'text/html',body:site.pages.find(p=>p.slug===slug)!.html})});await page.goto('https://scene.test/index.html');
 const root=page.locator('#forge-immersive-world'),canvas=root.locator('canvas'),links=root.locator('[data-world-hotspot]');await expect(root).toHaveAttribute('data-loaded','true');
 const positions=await links.evaluateAll(links=>links.map(link=>{const r=link.getBoundingClientRect();return [r.x,r.y]}));const before=await canvas.screenshot();
 const rect=(await canvas.boundingBox())!;await page.mouse.move(rect.x+rect.width*.8,rect.y+rect.height*.53);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.3,rect.y+rect.height*.53,{steps:5});await page.mouse.up();
 expect((await canvas.screenshot()).equals(before)).toBe(false);
 expect(await links.evaluateAll(links=>links.map(link=>{const r=link.getBoundingClientRect();return [r.x,r.y]}))).toEqual(positions);
 await root.locator('[data-world-page="about"]').click();await expect(page).toHaveURL(/about\.html$/);await expect(page.locator('#forge-immersive-world .world-copy h2')).toHaveText('About');
});
