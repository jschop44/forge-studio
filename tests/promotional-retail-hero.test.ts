import test from 'node:test';
import assert from 'node:assert/strict';
import {applySourceDesign} from '../src/lib/apply-source-design';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';

const homepage={slug:'index',title:'Home',html:'<!doctype html><html><head></head><body><nav><a href="index.html">Best Buy</a></nav><main><section class="site-hero editorial text-led"><div><p>Electronics Retail</p><h1>Best Buy</h1><p>Browse computers, headphones and kitchen appliances.</p></div></section></main></body></html>'};

test('retail hero rejects source promotional banners containing cropped offer lettering',()=>{
 const source=extractWebsiteDesignDna('<img src="/sale-banner.jpg" alt="Holiday Appliance Deals! Save up to 50% on select major appliances. Terms apply." width="1800" height="380">','https://www.bestbuy.com/');
 const result=applySourceDesign([homepage],source,'redesign').pages[0].html;
 assert.doesNotMatch(result,/data-forge-source-figure/);
 assert.doesNotMatch(result,/<img[^>]+sale-banner\.jpg/);
 assert.match(result,/class="site-hero editorial text-led"/);
});

test('real category photography stays eligible while the discount banner is rejected',()=>{
 const source=extractWebsiteDesignDna(
  '<img src="/holiday-sale.jpg" alt="Save up to 40% on selected appliances. Limited-time offer." width="1800" height="430">'+
  '<img src="/small-kitchen.jpg" alt="Small Kitchen Appliances" width="1000" height="700">',
  'https://www.bestbuy.com/');
 const result=applySourceDesign([homepage],source,'redesign').pages[0].html;
 assert.match(result,/class="site-hero editorial image-led"/);
 assert.match(result,/src="https:\/\/www\.bestbuy\.com\/small-kitchen\.jpg"/);
 assert.doesNotMatch(result,/<img[^>]+holiday-sale\.jpg/);
});

test('Preserve Style and unrelated business types retain existing nonpromotional source evidence',()=>{
 const source=extractWebsiteDesignDna('<img src="/grand-opening.jpg" alt="Our neighborhood grand opening" width="900" height="700">','https://example.com/');
 const original={slug:'index',title:'Home',html:'<!doctype html><html><head></head><body><main><h1>Our neighborhood grand opening</h1><figure class="editorial-photo"><img src="https://stock.example/placeholder.jpg" alt=""></figure></main></body></html>'};
 const result=applySourceDesign([original],source,'inspired').pages[0].html;
 assert.match(result,/src="https:\/\/example\.com\/grand-opening\.jpg"/);
});
