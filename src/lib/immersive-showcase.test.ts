import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createContextualShowcase} from './immersive-showcase';

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
