import {test} from 'node:test';
import assert from 'node:assert/strict';
import {licensedBusinessVisualAssets,specificVisualOfferings} from '../src/lib/visual-assets';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {discoverBusinessVisuals} from '../src/lib/server/business-visuals';

const asset=(title:string,license='CC0')=>({
 url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/'+title.toLowerCase().replace(/ /g,'-')+'.jpg',
 title,credit:'Photographer',source:'https://commons.wikimedia.org/wiki/File:'+title.replace(/ /g,'_')+'.jpg',license
});

test('exact offerings unlock photos without borrowing an unrelated niche image',()=>{
 const wings=asset('Crispy chicken wings on a plate');
 const credited={...wings,url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/credited.jpg',license:'CC BY 4.0'};
 const lobby=asset('Dental practice lobby');
 const matches=licensedBusinessVisualAssets('Restaurant',['Chicken wings'],[wings,credited,lobby,asset('Bowl of salad')]);
 assert.deepEqual(matches,[wings]);
 assert.deepEqual(specificVisualOfferings(['Products','General services','Contact team','Chicken wings','Chicken wings']),['Chicken wings']);
});

test('restaurant offering cards use exact licensed photos without putting wings onto pasta',()=>{
 const wings=asset('Fresh chicken wings');
 const pizza=asset('Pizza baked in a brick oven');
 const site=generateBusinessWebsite({
  businessName:'Family Restaurant',industry:'Restaurant',
  description:'Pizza, chicken wings and pasta prepared for dine-in and carryout.',
  services:['Chicken wings','Pizza','Pasta'],visualAssets:[wings,pizza],
  experienceStyle:'standard'
 });
 const html=site.pages.find(page=>page.slug==='services')!.html;
 const wingsCard=html.match(/<article id="offering-0"[\s\S]*?<\/article>/)![0];
 const pizzaCard=html.match(/<article id="offering-1"[\s\S]*?<\/article>/)![0];
 const pastaCard=html.match(/<article id="offering-2"[\s\S]*?<\/article>/)![0];
 assert.ok(wingsCard.includes(wings.url));
 assert.ok(pizzaCard.includes(pizza.url));
 assert.ok(!pastaCard.includes('service-photo'));
 assert.equal((html.match(/class="service-photo"/g)||[]).length,2);
});

test('Pexels and Commons searches start concurrently to fit the free preview budget',async()=>{
 const original=process.env.PEXELS_API_KEY;
 process.env.PEXELS_API_KEY='mock-key';
 const resolvers=new Map<string,(response:Response)=>void>();
 const fetcher=((input:RequestInfo|URL)=>{
  const host=new URL(String(input)).hostname;
  return new Promise<Response>(resolve=>resolvers.set(host,resolve));
 }) as typeof fetch;
 try{
  const promise=discoverBusinessVisuals('Pizza',fetcher);
  assert.ok(resolvers.has('api.pexels.com'));
  assert.ok(resolvers.has('commons.wikimedia.org'));
  resolvers.get('api.pexels.com')!(new Response(JSON.stringify({photos:[{width:3840,height:2160,alt:'Pizza with mozzarella',photographer:'Jane',url:'https://www.pexels.com/photo/pizza-123/',src:{large2x:'https://images.pexels.com/photos/123/pizza.jpg'}}]})));
  resolvers.get('commons.wikimedia.org')!(new Response(JSON.stringify({query:{pages:{1:{title:'File:Pizza in oven.jpg',imageinfo:[{mime:'image/jpeg',width:4800,height:3200,thumburl:'https://upload.wikimedia.org/wikipedia/commons/a/ab/pizza.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Pizza_in_oven.jpg',extmetadata:{LicenseShortName:{value:'CC0'},Artist:{value:'Jane'}}}]}}}})));
  const results=await promise;
  assert.equal(results.length,2);
  assert.ok(results.some(item=>item.license==='Pexels License'));
  assert.ok(results.some(item=>item.license==='CC0'));
 }finally{if(original===undefined)delete process.env.PEXELS_API_KEY;else process.env.PEXELS_API_KEY=original}
});
