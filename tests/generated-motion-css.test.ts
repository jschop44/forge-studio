import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
test('all generated pages include dynamic reduced-motion control visibility',()=>{
 const site=generateBusinessWebsite({businessName:'Studio',industry:'Design',description:'An independent design studio.',services:['Design']});
 assert.equal(site.pages.length,4);
 for(const page of site.pages)assert.match(page.html,/@media\(prefers-reduced-motion:reduce\)\{\[aria-label="Immersive world movement"\]\{display:none!important\}/);
});

import {enhanceCinematicPages} from '../src/lib/website-experience';
import {enhanceImmersivePages} from '../src/lib/immersive-showcase';
test('cinematic chapters occupy document flow and leave text geometrically flat',()=>{
 const [{html}]=enhanceCinematicPages([{slug:'services',html:'<html><head></head><body><main><section class="site-hero">Copy</section></main><footer>Contact</footer></body></html>'}]);
 assert.match(html,/\.cinematic-chapters\{position:relative;/);
 assert.match(html,/if\(footer\)footer.before\(controls\)/);
 assert.doesNotMatch(html,/perspective:1200px|translateZ\(15px\)|position:fixed/);
 assert.match(html,/min-height:44px/);
});
test('immersive enhancement moves environment surfaces without projecting text sections',()=>{
 const [{html}]=enhanceImmersivePages([{slug:'services',html:'<html><head></head><body><nav>Navigation</nav><main><section>Readable services</section></main><footer>Contact</footer></body></html>'}]);
 assert.match(html,/body>main>section\{transform:none;transition:none\}/);
 assert.doesNotMatch(html,/transform:perspective\(1800px\)/);
 assert.match(html,/body>main>section:after\{transform:translateY/);
});
