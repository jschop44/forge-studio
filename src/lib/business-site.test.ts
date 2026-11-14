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
   assert.match(page.html,/<nav\b[^>]*aria-label="Main navigation"[^>]*>/);
   assert.match(page.html,/<a class="skip-link" href="#main-content">Skip to main content<\/a>/);
   assert.match(page.html,/<main id="main-content" tabindex="-1">/);
   assert.match(page.html,/<h1>/);
   assert.doesNotMatch(page.html,/src="undefined"|url\("undefined"\)/i);
   for(const script of page.html.matchAll(/<script\b([^>]*)>/gi)){
    assert.match(script[1],/\b(?:type="application\/ld\+json"|id="forge-(?:home-webgl-controller|spatial-controller|business-photo-controller)")/,'Only structured data and trusted Forge WebGL scripts are allowed');
   }
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
 assert.match(contact,/Contact details are being updated/);
 assert.doesNotMatch(contact,/mailto:|<form/i);
});
test('verified business contact email is escaped and linked',()=>{
 const site=generateBusinessWebsite({...brief('Accounting and bookkeeping'),contactEmail:'hello@example.com'});
 const contact=site.pages.find(p=>p.slug==='contact')!.html;
 assert.match(contact,/href="mailto:hello@example\.com"/);
 assert.match(contact,/href="mailto:hello@example\.com\?subject=Inquiry%20for%20Example%20Business"/);
 assert.match(contact,/>Email Example Business →<\/a>/);
 assert.doesNotMatch(contact,/Contact details are being updated/);
});
test('untrusted business content is escaped before appearing in generated HTML',()=>{
 const site=generateBusinessWebsite({businessName:'Example <script>alert(1)</script>',industry:'Professional consulting',description:'A trusted team offering <img src=x onerror=alert(1)> services locally.',services:['<svg onload=alert(1)>']});
 for(const page of site.pages){
  assert.doesNotMatch(page.html,/<script>alert\(1\)<\/script>|<svg onload=|<img src=x onerror=/i);
 }
});

test('generated pages keep text upright without forced 3D perspective or photo tilt',()=>{
 const site=generateBusinessWebsite(brief('Restaurant and hospitality'));
 for(const page of site.pages){
  assert.doesNotMatch(page.html,/main\{perspective:1400px\}|\.cards\{perspective:900px\}|rotateY\(-3deg\)/);
  assert.match(page.html,/main\{perspective:none\}/);
 }
});

test('image-led design uses a distinct responsive hero while editorial remains selectable',()=>{
 const imageLed=generateBusinessWebsite({...brief('Sporting goods retail'),layout:'image-led'}).pages[0].html;
 const editorial=generateBusinessWebsite({...brief('Sporting goods retail'),layout:'editorial'}).pages[0].html;
 assert.match(imageLed,/data-forge-layout="image-led"/);
 assert.match(imageLed,/site-hero image-led/);
 assert.match(imageLed,/body\[data-forge-layout="image-led"\] \.site-hero\{grid-template-columns:minmax/);
 assert.match(imageLed,/@media\(max-width:700px\)\{body\[data-forge-layout="image-led"\] \.site-hero\{grid-template-columns:1fr\}/);
 assert.match(editorial,/data-forge-layout="editorial"/);
 assert.match(editorial,/site-hero editorial/);
});


test('large entertainment destination pages use editorial links rather than invented service inquiries',()=>{
 const site=generateBusinessWebsite({
  businessName:'Disney Home',industry:'Entertainment, media and theme parks',
  description:'Explore family entertainment, parks, movies and stories.',
  services:['More Disney+','Vacation with Disney Parks','Disney Partners']
 });
 const home=site.pages[0].html,catalog=site.pages[1].html;
 assert.equal(site.pages[1].title,'Explore');
 assert.match(home,/>Explore topics<\/a>/);
 assert.match(home,/Discover more\./);
 assert.match(home,/href="services\.html#offering-0" aria-label="Explore More Disney\+"/);
 assert.match(home,/Explore this topic →/);
 assert.match(catalog,/Stories &amp; destinations/);
 assert.match(catalog,/related stories, destinations and experiences/);
 assert.doesNotMatch(home+catalog,/Ask about this service|Ask about availability|href="contact\.html" aria-label="Ask about /);
 assert.deepEqual(site.pages.map(p=>p.slug),['index','services','about','contact']);
});
test('ordinary local services keep genuine inquiry links and service navigation',()=>{
 for(const industry of ['Music lessons','Events and seasonal attractions','Wedding planning']){
  const site=generateBusinessWebsite(brief(industry));
  assert.equal(site.pages[1].title,'Services');
  assert.match(site.pages[0].html,/Ask about this service/);
  assert.match(site.pages[0].html,/href="contact\.html" aria-label="Ask about /);
 }
});
