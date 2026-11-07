import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createContextualShowcase,enhanceImmersivePages} from './immersive-showcase';

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

test('spatial enhancement applies across secondary pages but leaves the immersive homepage intact',()=>{
 const pages=[{slug:'index',html:'<!doctype html><html><head></head><body>home</body></html>'},{slug:'services',html:'<!doctype html><html><head></head><body><main><h1>Services</h1></main></body></html>'},{slug:'about',html:'<!doctype html><html><head></head><body><main><h1>About</h1></main></body></html>'},{slug:'contact',html:'<!doctype html><html><head></head><body><main><h1>Contact</h1></main></body></html>'}];
 const result=enhanceImmersivePages(pages);
 assert.equal(result[0].html,pages[0].html);
 for(const page of result.slice(1)){assert.match(page.html,/id="forge-spatial-layer"/);assert.match(page.html,/id="forge-spatial-controller"/);assert.match(page.html,/prefers-reduced-motion:reduce/)}
 assert.equal(pages[1].html.includes('forge-spatial-layer'),false);
});
test('spatial enhancement skips incomplete HTML documents safely',()=>{
 const pages=[{slug:'about',html:'<h1>fragment</h1>'}];
 assert.deepEqual(enhanceImmersivePages(pages),pages);
});
