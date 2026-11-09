import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAiComposition,compositionAppearance} from '../src/lib/ai-composition';
import {createContextualShowcase} from '../src/lib/immersive-showcase';
import {generateBusinessWebsite} from '../src/lib/business-site';
const composition={description:'A studio providing website design for local businesses.',design:{layout:'image-led' as const,palette:'mint' as const}};
test('model composition selects a validated layout and palette rendered into all pages',()=>{
 const parsed=parseAiComposition('```json\n'+JSON.stringify(composition)+'\n```');
 const appearance=compositionAppearance(parsed.design);
 const result=generateBusinessWebsite({businessName:'Cedar Studio',industry:'Design',description:parsed.description,services:['Website design'],...appearance});
 assert.equal(appearance.accent,'#9ee3bf');
 assert.ok(result.pages.every(page=>page.html.includes('data-forge-layout="image-led"')));
 assert.match(result.pages[0].html,/class="site-hero image-led(?: text-led)?"/);
 assert.ok(result.pages[0].html.includes('@media(max-width:700px){.site-hero.image-led{grid-template-columns:1fr}}'));
});
test('missing design, arbitrary model code and invalid choices are rejected without a fallback',()=>{
 for(const value of [{description:composition.description},{...composition,design:{layout:'<script>',palette:'mint'}},{...composition,design:{layout:'editorial',palette:'url(https://evil.example)'}},{...composition,html:'<script>alert(1)</script>'}])assert.throws(()=>parseAiComposition(JSON.stringify(value)),/Invalid model composition/);
 assert.throws(()=>parseAiComposition('x'.repeat(5001)),/Invalid model composition/);
});

test('interactive builder home applies model choices while retaining the immersive controls',()=>{
 const pages=createContextualShowcase({businessName:'Cedar Studio',industry:'Design',description:composition.description,services:['Website design'],design:composition.design});
 assert.ok(pages[0].html.includes('data-forge-layout="image-led"'));
 assert.ok(pages[0].html.includes('--brand-accent:#9ee3bf'));
 assert.ok(pages[0].html.includes('class="ai-hero-visual"'));
 assert.ok(pages[0].html.includes('Reset view'));
});
