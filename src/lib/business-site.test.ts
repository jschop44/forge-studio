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
   assert.doesNotMatch(page.html,/src="undefined"|url\("undefined"\)|<script(?! type="application\/ld\+json")[^>]*>/i);
   assert.doesNotMatch(page.html,/pornograph|erotic|graphic gore|illicit drugs/i);
   assert.match(page.html,/Example Business/);
   assert.match(page.html,/<title>[^<]+<\/title>/);
   assert.doesNotMatch(page.html,/href="(?:javascript:|data:|#undefined)|<img(?![^>]*\balt=)[^>]*>/i);
   for(const target of page.html.matchAll(/href="([a-z-]+\.html)"/g))assert.ok(site.pages.some(p=>p.slug+'.html'===target[1]),'internal link resolves: '+target[1]);
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

test('contact page never invents contact details',()=>{
 const site=generateBusinessWebsite(brief('Accounting and bookkeeping'));
 const contact=site.pages.find(p=>p.slug==='contact')!.html;
 assert.match(contact,/Contact information has not been supplied/);
 assert.doesNotMatch(contact,/mailto:|<form/i);
});
test('verified business contact email is escaped and linked',()=>{
 const site=generateBusinessWebsite({...brief('Accounting and bookkeeping'),contactEmail:'hello@example.com'});
 const contact=site.pages.find(p=>p.slug==='contact')!.html;
 assert.match(contact,/href="mailto:hello@example\.com"/);
 assert.doesNotMatch(contact,/Contact information has not been supplied/);
});
test('untrusted business content is escaped before appearing in generated HTML',()=>{
 const site=generateBusinessWebsite({businessName:'Example <script>alert(1)</script>',industry:'Professional consulting',description:'A trusted team offering <img src=x onerror=alert(1)> services locally.',services:['<svg onload=alert(1)>']});
 for(const page of site.pages){
  assert.doesNotMatch(page.html,/<script>alert\(1\)<\/script>|<svg onload=|<img src=x onerror=/i);
 }
});
