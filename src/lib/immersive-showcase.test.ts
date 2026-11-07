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
