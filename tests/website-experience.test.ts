import {servicePhoto} from '../src/lib/industry-photos';
import {generateBusinessWebsite} from '../src/lib/business-site';
import test from 'node:test';
import assert from 'node:assert/strict';
import {objectNavigationPlan,inferBusinessIndustry} from '../src/lib/website-experience';
test('objects and their destinations match verified niche and offerings',()=>{
 assert.deepEqual(objectNavigationPlan({industry:'Coffee shop',services:['Coffee beans','Ceramic mugs']}),{theme:'coffee',targets:[{part:'handle',label:'Ceramic mugs',href:'services.html#offering-1'},{part:'coffee',label:'Coffee beans',href:'services.html#offering-0'}]});
 const baseball=objectNavigationPlan({industry:'Baseball store',services:['Baseball bats','Gloves','Coffee beans']});
 assert.equal(baseball?.theme,'baseball');assert.ok(!baseball?.targets.some(t=>t.part==='coffee'));assert.equal(baseball?.targets[0].href,'services.html#offering-0');
});
test('food-page context may use coffee, but general baseball pages and unrelated niches do not',()=>{
 assert.equal(objectNavigationPlan({industry:'Baseball stadium',services:['Coffee beans'],pagePurpose:'food'})?.theme,'coffee');
 assert.equal(objectNavigationPlan({industry:'Baseball stadium',services:['Coffee beans']}),null);
 assert.equal(objectNavigationPlan({industry:'Accountancy',services:['Tax advice']}),null);
 assert.equal(objectNavigationPlan({industry:'Coffee shop',services:['Catering']}),null);
});

const brief={businessName:'Northstar Coffee',industry:'Coffee shop',description:'A neighborhood coffee shop providing coffee beans and ceramic drinkware.',services:['Coffee beans','Ceramic mugs']};
test('standard sites omit immersive controllers and object scenes; cinematic remains a distinct choice',()=>{
 const standard=generateBusinessWebsite({...brief,experienceStyle:'standard'});
 assert.equal(standard.pages.length,4);
 for(const page of standard.pages){assert.ok(!page.html.includes('forge-spatial-controller'));assert.ok(!page.html.includes('forge-home-webgl-controller'));assert.ok(!page.html.includes('data-object-navigation'));}
 const cinematic=generateBusinessWebsite({...brief,experienceStyle:'cinematic'}).pages[0].html;assert.ok(cinematic.includes('forge-cinematic-controller'));assert.ok(!cinematic.includes('forge-home-webgl-controller'));assert.ok(!cinematic.includes('forge-world-movement'));
});
test('object navigation uses actual offering anchors and refuses unrelated niches',()=>{
 const pages=generateBusinessWebsite({...brief,experienceStyle:'object-navigation'}).pages;
 for(const page of pages)assert.ok(page.html.includes('forge-object-navigation-controller'));
 assert.ok(pages[0].html.includes('services.html#offering-1'));
 assert.ok(pages[1].html.includes('id="offering-1"'));
 assert.ok(!pages[0].html.includes('forge-home-webgl-controller'));
 assert.throws(()=>generateBusinessWebsite({...brief,industry:'Accountancy',services:['Tax advice'],experienceStyle:'object-navigation'}),/supported business niche/);
 const baseball=generateBusinessWebsite({...brief,industry:'Baseball store',services:['Baseball bats','Baseballs','Gloves'],experienceStyle:'object-navigation'}).pages[0].html;
 assert.ok(baseball.includes('"theme":"baseball"'));assert.ok(!baseball.includes('"theme":"coffee"'));
});

test('theme selection preserves the full business range rather than limiting it to the main product',()=>{
 const services=['Coffee beans','Ceramic mugs','Fresh pastries','Live music events','Local art displays','Community workshops'];
 const pages=generateBusinessWebsite({...brief,services,experienceStyle:'object-navigation'}).pages;
 for(const service of services)assert.ok(pages.find(page=>page.slug==='services')!.html.includes(service));
 assert.ok(servicePhoto('Fresh pastries','Coffee shop'));
 assert.equal(servicePhoto('Contact the team','Coffee shop'),null);
 assert.equal(servicePhoto('Bathroom design','Interior design'),null);
 assert.equal(servicePhoto('Care services','Healthcare'),null);
});

test('incidental coffee offerings do not reclassify a clear baseball business',()=>{
 assert.equal(inferBusinessIndustry('Baseball Supply','We sell bats, gloves, and coffee at our concession counter.'),'Baseball and sporting goods');
 assert.equal(inferBusinessIndustry('Northstar Coffee','Coffee, baked goods, events, and neighborhood gatherings.'),'Coffee shop and cafe');
});

test('industry inference does not classify ordinary businesses as AI technology',()=>{
 assert.equal(inferBusinessIndustry('Hair & Beauty Studio','Hair styling and wellness services'),'Health and wellness');
 assert.equal(inferBusinessIndustry('AI Solutions','Custom automation and software'),'Technology');
});
