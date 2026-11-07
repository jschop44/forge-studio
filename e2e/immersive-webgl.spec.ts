import {test,expect} from '@playwright/test';
import {enhanceImmersivePages} from '../src/lib/immersive-showcase';
import {generateBusinessWebsite} from '../src/lib/business-site';

const source='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><section style="height:120vh">First</section><section style="height:120vh">Second</section></main></body></html>';

test('generated secondary page renders immersive WebGL without breaking page content',async({page})=>{
 const html=enhanceImmersivePages([{slug:'services',html:source}])[0].html;
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent(html);
 await expect(page.locator('main section')).toHaveCount(2);
 await expect(page.locator('#forge-spatial-controller')).toHaveCount(1);
 await expect(page.locator('#forge-spatial-layer')).toHaveCount(1);
 await page.waitForTimeout(200);
 const canvas=page.locator('#forge-webgl-atmosphere');
 if(await canvas.count()){
  await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).width)).toBeGreaterThan(0);
  await page.mouse.move(200,180);
  await page.mouse.down();
  await page.mouse.up();
  await page.evaluate(()=>window.scrollTo(0,window.innerHeight));
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector('main section')!).getPropertyValue('--forge-section-depth'))).not.toBe('');
 }
 expect(errors).toEqual([]);
});

test('reduced motion keeps immersive page content accessible without a GPU canvas',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const html=enhanceImmersivePages([{slug:'about',html:source}])[0].html;
 await page.setContent(html);
 await expect(page.locator('main section')).toHaveCount(2);
 await expect(page.locator('#forge-webgl-atmosphere')).toHaveCount(0);
 await expect(page.locator('#forge-spatial-layer')).toHaveCount(1);
});

test('scene keyboard controls preserve native scrolling and editable fields',async({page})=>{
 const html=enhanceImmersivePages([{slug:'contact',html:source.replace('<main>','<main><input aria-label="Your name" />')}])[0].html;
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent(html);
 await page.keyboard.press('ArrowDown');
 await page.locator('input').focus();
 await page.keyboard.type('Example');
 await expect(page.locator('input')).toHaveValue('Example');
 await expect(page.locator('main section')).toHaveCount(2);
 expect(errors).toEqual([]);
});

test('homepage receives shared WebGL renderer without secondary-page CSS overrides',async({page})=>{
 const html=enhanceImmersivePages([{slug:'index',html:source}])[0].html;
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent(html);
 await expect(page.locator('#forge-home-webgl')).toHaveCount(1);
 await expect(page.locator('#forge-home-webgl-controller')).toHaveCount(1);
 await expect(page.locator('#forge-spatial-layer')).toHaveCount(0);
 await expect(page.locator('main section')).toHaveCount(2);
 expect(errors).toEqual([]);
});

test('production generator exports immersive Home Services About and Contact pages',async({page})=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice serving local clients.',services:['Architecture','Interior design']}).pages;
 expect(pages.map(item=>item.slug)).toEqual(['index','services','about','contact']);
 for(const generated of pages){
  const errors:string[]=[];
  const onError=(error:Error)=>errors.push(error.message);
  page.on('pageerror',onError);
  await page.setContent(generated.html);
  await expect(page.locator('main#main-content')).toHaveCount(1);
  const webglSupported=await page.evaluate(()=>{const probe=document.createElement('canvas');return !!probe.getContext('webgl')});
  await expect(page.locator('#forge-webgl-atmosphere')).toHaveCount(webglSupported?1:0);
  await expect(page.locator('nav[aria-label="Main navigation"]')).toHaveCount(1);
  expect(errors,generated.slug).toEqual([]);
  page.off('pageerror',onError);
 }
});

test('homepage WebGL overlay never blocks navigation or form interaction',async({page})=>{
 const html=enhanceImmersivePages([{slug:'index',html:source.replace('<main>','<nav><a href="#contact">Contact</a></nav><main><input aria-label="Visitor name"><section id="contact">Contact</section>')}])[0].html;
 await page.setContent(html);
 const input=page.getByRole('textbox',{name:'Visitor name'});
 await input.fill('Alex');
 await expect(input).toHaveValue('Alex');
 await page.getByRole('link',{name:'Contact'}).click();
 await expect(page).toHaveURL(/#contact$/);
 const overlay=page.locator('#forge-webgl-atmosphere');
 if(await overlay.count())await expect(overlay).toHaveCSS('pointer-events','none');
});

test('homepage WebGL is absent with reduced motion enabled',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setContent(enhanceImmersivePages([{slug:'index',html:source}])[0].html);
 await expect(page.locator('#forge-home-webgl-controller')).toHaveCount(1);
 await expect(page.locator('#forge-webgl-atmosphere')).toHaveCount(0);
 await expect(page.locator('main section')).toHaveCount(2);
});

test('all four generated pages preserve navigation and keyboard focus with immersive effects',async({page})=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent architecture and interior design practice.',services:['Architecture','Interior design']}).pages;
 for(const generated of pages){
  await page.setContent(generated.html);
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  await expect(nav).toBeVisible();
  await expect(page.locator('main#main-content')).toHaveCount(1);
  const links=nav.locator('a');
  expect(await links.count()).toBeGreaterThan(0);
  await links.first().focus();
  await expect(links.first()).toBeFocused();
  const canvas=page.locator('#forge-webgl-atmosphere');
  if(await canvas.count())await expect(canvas).toHaveCSS('pointer-events','none');
 }
});

test('immersive pages remain interactive at narrow mobile viewport widths',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent architecture and interior design practice.',services:['Architecture','Interior design']}).pages;
 for(const generated of pages){
  const errors:string[]=[];
  const onError=(error:Error)=>errors.push(error.message);
  page.on('pageerror',onError);
  await page.setContent(generated.html);
  await expect(page.locator('main#main-content')).toBeVisible();
  await page.evaluate(()=>{document.body.style.minHeight='200vh';window.scrollTo(0,document.documentElement.scrollHeight)});
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);
  expect(errors,generated.slug).toEqual([]);
  page.off('pageerror',onError);
 }
});

test('immersive canvas scales down on mobile high-density screens',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.emulateMedia({reducedMotion:'no-preference'});
 const html=enhanceImmersivePages([{slug:'services',html:source}])[0].html;
 await page.setContent(html);
 const canvas=page.locator('#forge-webgl-atmosphere');
 const supported=await page.evaluate(()=>Boolean(document.createElement('canvas').getContext('webgl')));
 if(supported){
  await expect(canvas).toHaveCount(1);
  await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).width)).toBeGreaterThan(0);
  const dimensions=await canvas.evaluate(el=>({width:(el as HTMLCanvasElement).width,height:(el as HTMLCanvasElement).height}));
  expect(dimensions.width).toBeLessThanOrEqual(375);
  expect(dimensions.height).toBeLessThanOrEqual(812);
 }
});

test('homepage WebGL controller executes without uncaught errors',async({page})=>{
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 const generated=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent architecture and interior design practice.',services:['Architecture','Interior design']}).pages;
 const home=generated.find(item=>item.slug==='index');
 expect(home).toBeDefined();
 await page.setContent(home!.html);
 await expect(page.locator('#forge-home-webgl-controller')).toHaveCount(1);
 await page.mouse.move(140,180);
 await page.evaluate(()=>window.scrollTo(0,300));
 await page.waitForTimeout(150);
 expect(errors).toEqual([]);
});

test('WebGL scene creates a drawable canvas when browser GPU support exists',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const supported=await page.evaluate(()=>{const canvas=document.createElement('canvas');return Boolean(canvas.getContext('webgl'))});
 const generated=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture']}).pages;
 const home=generated.find(item=>item.slug==='index');
 expect(home).toBeDefined();
 await page.setContent(home!.html);
 const canvas=page.locator('#forge-webgl-atmosphere');
 if(supported){
  await expect(canvas).toHaveCount(1);
  await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).width)).toBeGreaterThan(0);
 }else{
  await expect(canvas).toHaveCount(0);
 }
});

test('changing reduced-motion preference hides an active immersive canvas',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const generated=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture']}).pages;
 const home=generated.find(item=>item.slug==='index');
 expect(home).toBeDefined();
 await page.setContent(home!.html);
 const canvas=page.locator('#forge-webgl-atmosphere');
 await page.emulateMedia({reducedMotion:'reduce'});
 if(await canvas.count())await expect(canvas).toBeHidden();
 await expect(page.locator('main#main-content')).toBeVisible();
 await page.emulateMedia({reducedMotion:'no-preference'});
 if(await canvas.count())await expect(canvas).toBeVisible();
});

test('large desktop immersive framebuffer stays inside the GPU pixel budget',async({page})=>{
 await page.setViewportSize({width:2560,height:1440});
 await page.emulateMedia({reducedMotion:'no-preference'});
 const generated=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture']}).pages;
 const home=generated.find(item=>item.slug==='index');
 expect(home).toBeDefined();
 await page.setContent(home!.html);
 const canvas=page.locator('#forge-webgl-atmosphere');
 if(await canvas.count()){
  await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).width)).toBeGreaterThan(0);
  const pixels=await canvas.evaluate(el=>(el as HTMLCanvasElement).width*(el as HTMLCanvasElement).height);
  expect(pixels).toBeLessThanOrEqual(2205000);
 }
});

test('capture immersive desktop and mobile visual evidence for every generated page',async({page},testInfo)=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture','Interiors']}).pages;
 for(const viewport of [{name:'desktop',width:1440,height:900},{name:'mobile',width:375,height:812}]){
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  for(const generated of pages){
   await page.setContent(generated.html);
   await expect(page.locator('main#main-content')).toBeVisible();
   await page.waitForTimeout(120);
   await testInfo.attach('immersive-'+viewport.name+'-'+generated.slug,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  }
 }
});

test('print mode hides immersive effects while preserving page content',async({page})=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture','Interiors']}).pages;
 for(const generated of pages){
  await page.setContent(generated.html);
  await page.emulateMedia({media:'print'});
  const main=page.locator('main#main-content');
  await expect(main).toBeVisible();
  const canvas=page.locator('#forge-webgl-atmosphere');
  if(await canvas.count())await expect(canvas).toBeHidden();
  await page.emulateMedia({media:'screen'});
 }
});

test('WebGL initialization exception falls back to accessible content on every page',async({page})=>{
 await page.goto('about:blank');
 await page.evaluate(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<HTMLCanvasElement['getContext']>){
   if(args[0]==='webgl')throw new Error('Simulated GPU unavailable');
   return Reflect.apply(original,this,args);
  } as HTMLCanvasElement['getContext'];
 });
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture']}).pages;
 for(const generated of pages){
  const errors:string[]=[];
  const handler=(error:Error)=>errors.push(error.message);
  page.on('pageerror',handler);
  await page.setContent(generated.html);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('#forge-webgl-atmosphere')).toHaveCount(0);
  expect(errors,generated.slug).toEqual([]);
  page.off('pageerror',handler);
 }
});
