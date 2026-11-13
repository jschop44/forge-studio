import test from 'node:test';
import assert from 'node:assert/strict';
import {linkObservedOfferingDestinations} from '../src/lib/observed-product-links';
const source='https://www.bestbuy.com/';
const links=[
 {label:'TV & Home Theater',path:'/site/all-electronics-on-sale/all-tv-home-theater-on-sale/pcmcat1690836748285.c'},
 {label:'Apple',path:'/site/all-electronics-on-sale/all-apple-on-sale/pcmcat1688758488330.c'},
 {label:'Disney Live!',path:'/exit-interstitial/opaque'},
 {label:'Unsafe',path:'//other.example/steal'}
];
const page={slug:'services',title:'Products',html:'<html><body><nav><a href="contact.html">Contact</a></nav><main>'+
 '<article class="card service-card"><h2>TV &amp; Home Theater</h2><a href="contact.html" aria-label="Ask about televisions">Ask about availability</a></article>'+
 '<article class="card service-card"><h2>Apple</h2><a href="contact.html">Ask about availability</a></article>'+
 '<article class="card service-card"><h2>Unobserved Appliances</h2><a href="contact.html">Ask about availability</a></article>'+
 '<article class="card service-card"><h2>Disney Live!</h2><a href="contact.html">Ask about availability</a></article>'+
 '</main></body></html>'};
test('observed Best Buy catalog labels lead to their actual source categories, not generic contact',()=>{
 const [result]=linkObservedOfferingDestinations([page],source,links,'redesign');
 assert.match(result.html,/href="https:\/\/www\.bestbuy\.com\/site\/all-electronics-on-sale\/all-tv-home-theater-on-sale\//);
 assert.match(result.html,/href="https:\/\/www\.bestbuy\.com\/site\/all-electronics-on-sale\/all-apple-on-sale\//);
 assert.equal((result.html.match(/data-forge-observed-category/g)||[]).length,2);
 assert.match(result.html,/target="_blank" rel="noopener noreferrer"/);
 assert.ok(result.html.includes('<nav><a href="contact.html">Contact</a></nav>'));
 assert.match(result.html,/<h2>Unobserved Appliances<\/h2><a href="contact.html"/);
 assert.match(result.html,/<h2>Disney Live!<\/h2><a href="contact.html"/);
 assert.deepEqual(linkObservedOfferingDestinations([result],source,links,'redesign'),[result],'safe link mapping is idempotent');
});
test('new sites and unrelated or unsafe source URLs never import catalog navigation',()=>{
 assert.deepEqual(linkObservedOfferingDestinations([page],source,links,'new'),[page]);
 assert.deepEqual(linkObservedOfferingDestinations([page],'http://www.bestbuy.com/',links,'inspired'),[page]);
 assert.deepEqual(linkObservedOfferingDestinations([page],source,[{label:'TV & Home Theater',path:'https://other.example/other'}],'inspired'),[page]);
 assert.deepEqual(linkObservedOfferingDestinations([page],source,[{label:'TV & Home Theater',path:'/exit-interstitial/abc'}],'inspired'),[page]);
});
