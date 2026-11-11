import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {auditGeneratedDraft} from '../src/lib/draft-quality-gate';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';
import {applySourceDesign} from '../src/lib/apply-source-design';
const businesses=[
 {businessName:'Harbor Coffee',industry:'Coffee shop',description:'A neighborhood roaster selling freshly roasted coffee and handmade drinkware.',services:['Coffee beans','Ceramic mugs']},
 {businessName:'Harbor Wings',industry:'Pizza restaurant',description:'A restaurant serving chicken wings and fresh pizza to our neighborhood.',services:['Chicken wings','Pizza']},
 {businessName:'Meridian Horology',industry:'Clock restoration',description:'Specialists restoring antique clocks and maintaining mechanical watches.',services:['Clock restoration','Mechanical servicing']}
];
const modes=['standard','cinematic','object-navigation','immersive'] as const;
for(const business of businesses){
 for(const mode of modes){
  for(const layout of ['editorial','image-led'] as const){
   test(business.businessName+' '+mode+' '+layout+' yields four complete linked and reviewable business pages',()=>{
    const generated=generateBusinessWebsite({...business,experienceStyle:mode,layout});
    assert.deepEqual(generated.pages.map(p=>p.slug),['index','services','about','contact']);
    const report=auditGeneratedDraft(generated.pages);
    assert.equal(report.readyForReview,true,report.errors.join('; '));
    assert.equal(report.readyForPublishing,false);
    for(const page of generated.pages){
     assert.match(page.html,/<html lang="en">/);
     assert.match(page.html,/<meta name="viewport"/);
     assert.match(page.html,/href="services\.html"/);
     assert.match(page.html,/href="contact\.html"/);
     assert.match(page.html,/id="main-content"/);
     assert.match(page.html,/aria-label="Main navigation"/);
     assert.ok(page.html.includes(business.businessName));
    }
    for(const service of business.services){
     assert.ok(generated.pages[1].html.includes(service),'missing real business offering '+service);
    }
    if(mode==='immersive')assert.ok(generated.pages.every(page=>page.html.includes('id="forge-immersive-world"')));
    if(mode==='object-navigation')assert.ok(generated.pages.some(page=>page.html.includes('data-object-navigation')));
   });
  }
 }
}
test('redesign/preserve acceptance keeps authorized company logo and matching products across page modes',()=>{
 const source=extractWebsiteDesignDna('<img src="/logo.png" alt="Harbor Wings company logo"><img src="/wings.jpg" alt="Chicken wings"><img src="/pizza.jpg" alt="Pizza"><img src="/fruit.jpg" alt="Fruit bowl"><a href="mailto:team@harbor.example">Contact</a>','https://harbor.example/');
 for(const experienceStyle of modes){
  const generated=generateBusinessWebsite({...businesses[1],experienceStyle});
  for(const designMode of ['inspired','redesign']){
   const pages=applySourceDesign(generated.pages,source,designMode).pages;
   const result=auditGeneratedDraft(pages);
   assert.equal(result.readyForReview,true,designMode+' '+experienceStyle+': '+result.errors.join('; '));
   assert.equal(result.readyForPublishing,false);
   assert.ok(pages.every(page=>page.html.includes('https://harbor.example/logo.png')));
   assert.ok(pages.every(page=>page.html.includes('mailto:team@harbor.example')));
   assert.ok(pages.some(page=>page.html.includes('https://harbor.example/wings.jpg')));
   assert.ok(!pages.some(page=>page.html.includes('https://harbor.example/fruit.jpg')),
    'unrelated photos must not substitute for the business product');
  }
 }
});
