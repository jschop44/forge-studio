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
