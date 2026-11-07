import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {generateBusinessWebsite} from './business-site';
const brief=(industry:string)=>({businessName:'Example Business',industry,description:'A neighborhood business serving its local community.',services:['Customer support','Information']});
test('retail websites receive products navigation and relevant call to action',()=>{const site=generateBusinessWebsite(brief('Sporting goods retail'));assert.match(site.pages[0].html,/>Products<\/a>/);assert.match(site.pages[0].html,/>Explore products<\/a>/);assert.equal(site.pages[1].title,'Products')});
test('medical websites receive care-specific navigation',()=>{const site=generateBusinessWebsite(brief('Healthcare and medical services'));assert.match(site.pages[0].html,/Care &amp; services/)});
test('family-friendly seasonal themes never produce undefined image URLs',()=>{const site=generateBusinessWebsite(brief('Halloween family festival'));assert.doesNotMatch(site.pages[0].html,/src="undefined"|url\("undefined"\)/)});

const industries=[
 'Coffee shop and cafe','Sporting goods retail','Healthcare and medical services','Pharmacy',
 'Restaurant and hospitality','Real estate','Health and wellness','Automotive','Fashion and luxury',
 'Technology','Education and tutoring','Home and trade services','Legal services','Financial services',
 'Beauty and personal care','Arts and creative services','Pet and animal care',
 'Events and seasonal attractions','Agriculture and farming','Manufacturing and industrial',
 'Logistics and transportation','Construction','Architecture','Nonprofit and community organization',
 'Accounting and bookkeeping','Insurance agency','Florist and garden center','Hardware store',
 'Bookshop and stationery','Hotel and travel','Museum and cultural center','Music lessons',
 'Childcare and early education','Professional consulting','Cleaning and maintenance',
 'Wedding planning','Fitness and sports training','Landscaping and outdoor services',
 'Furniture and interior design','Renewable energy','Marine and boating','Bicycle shop',
 'Outdoor recreation','Grocery and food market','Veterinary clinic','Dental practice',
 'Software development','Photography studio','Artisan crafts','Language translation services',
 'Family-friendly Halloween festival','Community library','Local newspaper','Research laboratory'
];
for(const industry of industries){
 test('industry-wide site contract: '+industry,()=>{
  const site=generateBusinessWebsite(brief(industry));
  assert.equal(site.pages.length,4);
  assert.deepEqual(site.pages.map(p=>p.slug),['index','services','about','contact']);
  for(const page of site.pages){
   assert.match(page.html,/<html lang="en">/);
   assert.match(page.html,/<meta name="viewport"/);
   assert.match(page.html,/<nav>/);
   assert.match(page.html,/<h1>/);
   assert.doesNotMatch(page.html,/src="undefined"|url\("undefined"\)|<script(?! type="application/ld\\+json")[^>]*>/i);
   assert.doesNotMatch(page.html,/pornograph|erotic|graphic gore|illicit drugs/i);
   assert.match(page.html,/Example Business/);
  }
 });
}
test('rejects prohibited business categories without rejecting legitimate pharmacy',()=>{
 for(const industry of ['Pornography production','Adult entertainment','Recreational marijuana dispensary','Illicit drug dealer']){
  assert.throws(()=>generateBusinessWebsite(brief(industry)),/Unsupported business category/);
 }
 assert.equal(generateBusinessWebsite(brief('Community pharmacy')).pages.length,4);
 assert.equal(generateBusinessWebsite(brief('Hospital medication dispensary')).pages.length,4);
});
