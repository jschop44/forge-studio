import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createContextualShowcase,enhanceImmersivePages} from './immersive-showcase';
import {generateBusinessWebsite} from './business-site';

test('contextual immersive sites provide keyboard skip navigation and one main landmark',()=>{
 const page=createContextualShowcase({businessName:'Example Cafe',industry:'Coffee shop',description:'Coffee and community.',services:['Espresso','Pastries']})[0];
 assert.match(page.html,/<a class="skip-link" href="#main-content">Skip to main content<\/a>/);
 assert.match(page.html,/<nav aria-label="Main navigation">/);
 assert.match(page.html,/<main id="main-content" tabindex="-1">/);
 assert.equal((page.html.match(/<main\b/g)||[]).length,1);
});
test('contextual immersive pages escape user-supplied business names',()=>{
 const page=createContextualShowcase({businessName:'Cafe <script>alert(1)</script>',industry:'Coffee shop',description:'Fresh coffee.',services:['Espresso']})[0];
 assert.doesNotMatch(page.html,/<h1>Cafe <script>/);
 assert.match(page.html,/Cafe &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('service inquiries use the verified email and encode service-specific subjects',()=>{
 const html=createContextualShowcase({businessName:'North & South',industry:'Real estate',description:'Local agents.',services:['Buyer representation','Home staging'],contactEmail:'hello@example.com'})[0].html;
 assert.match(html,/mailto:hello@example\.com\?subject=Inquiry%20about%20Buyer%20representation/);
 assert.match(html,/mailto:hello@example\.com\?subject=Inquiry%20about%20Home%20staging/);
 assert.doesNotMatch(html,/<a href="#contact">Ask about Buyer representation/);
});
test('service inquiries fall back to contact section without verified email',()=>{
 const html=createContextualShowcase({businessName:'North & South',industry:'Real estate',description:'Local agents.',services:['Buyer representation'],contactEmail:'invalid-email'})[0].html;
 assert.match(html,/<a href="#contact">Ask about Buyer representation/);
 assert.doesNotMatch(html,/mailto:invalid-email/);
});

test('reference layout signals adapt immersive navigation, actions and media presentation',()=>{
 const html=createContextualShowcase({businessName:'Studio',industry:'Architecture',description:'Design.',services:['Planning'],visualSignals:{imageCount:4,sectionCount:5,heroSections:1,navigationLinks:7,buttonCount:6,hasVideo:true,hasCanvas:false}})[0].html;
 assert.match(html,/<body class="mode-new layout-standard layout-navigation-rich layout-action-rich layout-media-rich">/);
});
test('reference layout without strong signals retains standard presentation',()=>{
 const html=createContextualShowcase({businessName:'Studio',industry:'Architecture',description:'Design.',services:['Planning']})[0].html;
 assert.match(html,/<body class="mode-new layout-standard">/);
});

test('spatial enhancement adds WebGL to homepage while preserving its original layout',()=>{
 const pages=[{slug:'index',html:'<!doctype html><html><head></head><body>home</body></html>'},{slug:'services',html:'<!doctype html><html><head></head><body><main><h1>Services</h1></main></body></html>'},{slug:'about',html:'<!doctype html><html><head></head><body><main><h1>About</h1></main></body></html>'},{slug:'contact',html:'<!doctype html><html><head></head><body><main><h1>Contact</h1></main></body></html>'}];
 const result=enhanceImmersivePages(pages);
 assert.match(result[0].html,/id="forge-home-webgl"/);
 assert.match(result[0].html,/id="forge-home-webgl-controller"/);
 assert.match(result[0].html,/getContext\('webgl'/);
 assert.doesNotMatch(result[0].html,/id="forge-spatial-layer"/);
 assert.equal(enhanceImmersivePages(result)[0].html,result[0].html);
 for(const page of result.slice(1)){assert.match(page.html,/id="forge-spatial-layer"/);assert.match(page.html,/id="forge-spatial-controller"/);assert.match(page.html,/prefers-reduced-motion:reduce/)}
 assert.equal(pages[1].html.includes('forge-spatial-layer'),false);
});
test('spatial enhancement skips incomplete HTML documents safely',()=>{
 const pages=[{slug:'about',html:'<h1>fragment</h1>'}];
 assert.deepEqual(enhanceImmersivePages(pages),pages);
});

test('secondary-page depth responds to pointer input without duplicating the layer',()=>{
 const original=[{slug:'services',html:'<!doctype html><html><head></head><body><main><div class="card">Service</div></main></body></html>'}];
 const enhanced=enhanceImmersivePages(original);
 assert.match(enhanced[0].html,/--forge-tilt-x/);
 assert.match(enhanced[0].html,/pointerleave/);
 assert.match(enhanced[0].html,/hover:hover/);
 assert.equal(enhanceImmersivePages(enhanced)[0].html,enhanced[0].html);
});

test('spatial enhancement covers entire sections and suspends hidden-page motion updates',()=>{
 const page={slug:'services',html:'<!doctype html><html><head></head><body><main><section><h2>Services</h2></section></main></body></html>'};
 const html=enhanceImmersivePages([page])[0].html;
 assert.match(html,/body>main>section:after/);
 assert.match(html,/document\.hidden/);
 assert.match(html,/prefers-reduced-motion: reduce/);
 assert.equal((html.match(/id="forge-spatial-controller"/g)||[]).length,1);
});

test('section depth uses viewport position and respects reduced-motion preference',()=>{
 const html=enhanceImmersivePages([{slug:'about',html:'<!doctype html><html><head></head><body><main><section>About</section></main></body></html>'}])[0].html;
 assert.match(html,/--forge-section-depth/);
 assert.match(html,/function updateSections\(\)/);
 assert.match(html,/requestAnimationFrame\(updateSections\)/);
 assert.match(html,/reduced\.addEventListener\('change'/);
 assert.match(html,/body>main>section\{transform:none!important/);
});

test('secondary pages include GPU spatial atmosphere with accessible fallback',()=>{
 const source=[{slug:'services',html:'<!doctype html><html><head></head><body><main><section>Services</section></main></body></html>'}];
 const html=enhanceImmersivePages(source)[0].html;
 assert.match(html,/forge-webgl-atmosphere/);
 assert.match(html,/getContext\('webgl'/);
 assert.match(html,/gl\.drawArrays\(gl\.TRIANGLE_STRIP/);
 assert.match(html,/webglcontextlost/);
 assert.match(html,/aria-hidden/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.equal(enhanceImmersivePages(enhanceImmersivePages(source))[0].html,html);
});

test('GPU atmosphere reacts to pointer input across the viewport',()=>{
 const html=enhanceImmersivePages([{slug:'about',html:'<!doctype html><html><head></head><body><main>About</main></body></html>'}])[0].html;
 assert.match(html,/uniform vec2 m/);
 assert.match(html,/pointerX=e\.clientX/);
 assert.match(html,/gl\.uniform2f\(mouse,cameraX,cameraY\)/);
});

test('GPU atmosphere limits rendering cadence to reduce device load',()=>{
 const html=enhanceImmersivePages([{slug:'services',html:'<!doctype html><html><head></head><body><main>Services</main></body></html>'}])[0].html;
 assert.match(html,/lastPaint=0/);
 assert.match(html,/now-lastPaint<33/);
 assert.match(html,/lastPaint=now/);
});

test('WebGL scene includes ray-intersected 3D surface shading and directional light',()=>{
 const html=enhanceImmersivePages([{slug:'about',html:'<!doctype html><html><head></head><body><main>About</main></body></html>'}])[0].html;
 assert.match(html,/sqrt\(max\(0\.,radius\*radius-dist\)\)/);
 assert.match(html,/vec3 normal=normalize/);
 assert.match(html,/dot\(normal,light\)/);
 assert.match(html,/uniform float s/);
});

test('WebGL context loss stops rendering and removes the invalid canvas',()=>{
 const html=enhanceImmersivePages([{slug:'services',html:'<!doctype html><html><head></head><body><main>Services</main></body></html>'}])[0].html;
 assert.match(html,/canvas\.addEventListener\('webglcontextlost'/);
 assert.match(html,/active=false;if\(frame\)cancelAnimationFrame\(frame\);frame=0;canvas\.remove\(\)/);
});

test('WebGL camera eases pointer and scroll movement instead of snapping',()=>{
 const html=enhanceImmersivePages([{slug:'about',html:'<!doctype html><html><head></head><body><main>About</main></body></html>'}])[0].html;
 assert.match(html,/cameraX\+=\(pointerX-cameraX\)\*\.12/);
 assert.match(html,/cameraY\+=\(pointerY-cameraY\)\*\.12/);
 assert.match(html,/cameraScroll\+=\(scrollY-cameraScroll\)\*\.1/);
 assert.match(html,/gl\.uniform1f\(scroll,cameraScroll\)/);
});

test('failed GPU program setup cleans up shaders and removes unused canvas',()=>{
 const html=enhanceImmersivePages([{slug:'services',html:'<!doctype html><html><head></head><body><main>Services</main></body></html>'}])[0].html;
 assert.match(html,/gl\.deleteProgram\(program\)/);
 assert.match(html,/gl\.deleteShader\(vs\)/);
 assert.match(html,/gl\.deleteShader\(fs\)/);
 assert.match(html,/if\(vs\)gl\.deleteShader\(vs\)/);
 assert.match(html,/if\(fs\)gl\.deleteShader\(fs\)/);
});

test('WebGL initialization guards missing vertex attributes and GPU buffer allocation',()=>{
 const html=enhanceImmersivePages([{slug:'about',html:'<!doctype html><html><head></head><body><main>About</main></body></html>'}])[0].html;
 assert.match(html,/gl\.getAttribLocation\(program,'p'\)>=0/);
 assert.match(html,/if\(!buffer\)\{canvas\.remove\(\);gl\.deleteProgram\(program\)/);
});

test('WebGL animation pauses on pagehide and resumes after page restoration',()=>{
 const html=enhanceImmersivePages([{slug:'services',html:'<!doctype html><html><head></head><body><main>Services</main></body></html>'}])[0].html;
 assert.match(html,/addEventListener\('pagehide',onPageHide\)/);
 assert.match(html,/addEventListener\('pageshow',resume\)/);
 assert.match(html,/if\(frame\)cancelAnimationFrame\(frame\);frame=0/);
});

test('interactive 3D scene responds to page presses without hijacking controls',()=>{
 const html=enhanceImmersivePages([{slug:'services',html:'<!doctype html><html><head></head><body><main>Services</main></body></html>'}])[0].html;
 assert.match(html,/uniform float pulse/);
 assert.match(html,/addEventListener\('pointerdown'/);
 assert.match(html,/closest\('a,button,input,textarea,select,\[role=button\]'\)/);
 assert.match(html,/interactionPulse=1/);
 assert.match(html,/gl\.uniform1f\(pulse,interactionPulse\)/);
});

test('WebGL keyboard navigation preserves native links and form controls',()=>{
 const html=enhanceImmersivePages([{slug:'about',html:'<!doctype html><html><head></head><body><main>About</main></body></html>'}])[0].html;
 assert.match(html,/addEventListener\('keydown'/);
 assert.match(html,/event\.key==='ArrowLeft'/);
 assert.match(html,/event\.key==='ArrowRight'/);
 assert.match(html,/event\.key==='ArrowUp'/);
 assert.match(html,/event\.key==='ArrowDown'/);
 assert.match(html,/\[contenteditable\]/);
 assert.match(html,/if\(reduced\.matches\|\|document\.hidden\|\|event\.altKey/);
});

test('generated contextual homepage can receive shared WebGL without losing accessible navigation',()=>{
 const original=createContextualShowcase({businessName:'Harbor Studio',industry:'Architecture',description:'Thoughtful spaces.',services:['Design']});
 const enhanced=enhanceImmersivePages(original);
 const html=enhanced[0].html;
 assert.match(html,/id="forge-home-webgl-controller"/);
 assert.match(html,/getContext\('webgl'/);
 assert.match(html,/<a class="skip-link" href="#main-content">Skip to main content<\/a>/);
 assert.match(html,/<nav aria-label="Main navigation">/);
 assert.equal((html.match(/<main\b/g)||[]).length,1);
 assert.equal(enhanceImmersivePages(enhanced)[0].html,html);
});

test('production business generator includes immersive WebGL on every exported page',()=>{
 const generated=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice serving local clients.',services:['Architecture','Interior design']});
 assert.deepEqual(generated.pages.map(page=>page.slug),['index','services','about','contact']);
 for(const page of generated.pages){
  assert.match(page.html,/getContext\('webgl'/);
  assert.match(page.html,/canvas\.id='forge-webgl-atmosphere'/);
  assert.match(page.html,/<main id="main-content"/);
  assert.equal((page.html.match(/canvas\.id='forge-webgl-atmosphere'/g)||[]).length,1);
 }
});

test('homepage WebGL controller includes a complete renderer lifecycle',()=>{
 const pages=generateBusinessWebsite({businessName:'Northstar Coffee',industry:'Coffee shop',description:'Freshly roasted coffee and pastries for our neighborhood.',services:['Espresso','Coffee beans']}).pages;
 const home=pages.find(page=>page.slug==='index');assert.ok(home);
 const html=home.html;
 const controller=html.split('<script id="forge-home-webgl-controller">')[1]?.split('</script>')[0];
 assert.ok(controller);
 for(const required of ["const canvas=document.createElement('canvas')",'function draw(now)','function resume()','resume()','webglcontextlost']){
  assert.ok(controller.includes(required),'Missing WebGL renderer lifecycle marker: '+required);
 }
 assert.equal((html.match(/id="forge-home-webgl-controller"/g)||[]).length,1);
});

test('homepage WebGL remains visible above opaque layouts without intercepting interactions',()=>{
 const page=generateBusinessWebsite({businessName:'Northstar Coffee',industry:'Coffee shop',description:'Fresh coffee and pastries for the neighborhood.',services:['Espresso']}).pages[0];
 const css=page.html.split('<style id="forge-home-webgl">')[1]?.split('</style>')[0];
 assert.ok(css);
 assert.ok(css.includes('z-index:2'));
 assert.ok(css.includes('pointer-events:none'));
 assert.ok(css.includes('mix-blend-mode:screen'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});

test('existing WebGL pages are not wrapped with duplicate immersive controllers',()=>{
 const html='<!doctype html><html><head></head><body><canvas id="forge-webgl-atmosphere"></canvas><main>Existing scene</main></body></html>';
 const result=enhanceImmersivePages([{slug:'index',html}]);
 assert.equal(result[0].html,html);
});

test('immersive enhancement is idempotent for every generated route',()=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Design',industry:'Architecture',description:'Independent design practice with immersive digital spaces.',services:['Architecture','Interiors']}).pages;
 const again=enhanceImmersivePages(pages);
 assert.deepEqual(again,pages);
 for(const page of again){
  const scripts=(page.html.match(/id="forge-(?:home-webgl-controller|spatial-controller)"/g)||[]);
  assert.equal(scripts.length,1,'Exactly one immersive controller expected on '+page.slug);
 }
});

test('immersive enhancement leaves incomplete HTML documents untouched',()=>{
 for(const html of ['<main>Unclosed document','<html><head></head><body>Missing body end','<html><body>Missing head</body></html>']){
  assert.equal(enhanceImmersivePages([{slug:'services',html}])[0].html,html);
 }
});

test('immersive WebGL uses lower resolution on narrow mobile viewports',()=>{
 const pages=generateBusinessWebsite({businessName:'Northstar Coffee',industry:'Coffee shop',description:'Independent cafe offering coffee and pastries.',services:['Coffee']}).pages;
 for(const page of pages){
  assert.ok(page.html.includes('innerWidth<600?1:1.5'),'Missing mobile GPU cap on '+page.slug);
  assert.ok(page.html.includes('now-lastPaint<33'),'Missing frame rate cap on '+page.slug);
 }
});

test('every generated route includes layered camera-responsive WebGL depth',()=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Design studio creating distinctive spaces and interiors.',services:['Architecture','Interiors']}).pages;
 for(const page of pages){
  assert.ok(page.html.includes('distantRadius=.14'),'Missing secondary depth layer on '+page.slug);
  assert.ok(page.html.includes('distant=p+camera*.45'),'Missing independent camera parallax on '+page.slug);
  assert.ok(page.html.includes('distantAlpha'),'Missing distant scene compositing on '+page.slug);
 }
});

test('all generated routes composite immersive WebGL above content without blocking clicks',()=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design studio.',services:['Architecture']}).pages;
 for(const page of pages){
  const styleId=page.slug==='index'?'forge-home-webgl':'forge-spatial-layer';
  const css=page.html.split('<style id="'+styleId+'">')[1]?.split('</style>')[0];
  assert.ok(css,'Missing immersive stylesheet on '+page.slug);
  const overlay=css.match(/#forge-webgl-atmosphere\{([^}]*)\}/)?.[1];
  assert.ok(overlay,'Missing canvas styling on '+page.slug);
  for(const declaration of ['z-index:2','pointer-events:none','mix-blend-mode:screen']){
   assert.ok(overlay.includes(declaration),'Missing '+declaration+' on '+page.slug);
  }
 }
});

test('immersive framebuffer limits total pixel count on large displays',()=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture']}).pages;
 for(const page of pages){
  assert.ok(page.html.includes('Math.sqrt(2200000/Math.max(1,innerWidth*innerHeight*density*density))'),'Missing framebuffer budget on '+page.slug);
  assert.ok(page.html.includes('const pixelRatio=density*budgetScale'),'Missing budget scaling on '+page.slug);
 }
});

test('immersive WebGL camera accepts touch pointer movement without blocking scrolling',()=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture']}).pages;
 for(const page of pages){
  assert.ok(page.html.includes("addEventListener('pointermove',e=>{if(reduced.matches||document.hidden)return;pointerX="),'Missing touch-aware camera on '+page.slug);
  assert.ok(page.html.includes("},{passive:true});addEventListener('pointerdown'"),'Pointer movement must remain passive on '+page.slug);
 }
});

test('immersive WebGL suspends its animation loop during print preview',()=>{
 const pages=generateBusinessWebsite({businessName:'Harbor Studio',industry:'Architecture',description:'Independent design practice.',services:['Architecture']}).pages;
 for(const page of pages){
  assert.ok(page.html.includes("const printMedia=matchMedia('print')"),'Missing print media observer on '+page.slug);
  assert.ok(page.html.includes('reduced.matches||printMedia.matches)return'),'Missing print pause in render loop on '+page.slug);
  assert.ok(page.html.includes("printMedia.addEventListener('change',resume)"),'Missing print resume listener on '+page.slug);
 }
});
