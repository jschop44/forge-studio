import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedCatalogOfferings,matchingSourceBusiness,resolveGenerationSourceMode,usefulSourcePage} from '../src/lib/source-reuse-policy';
import {createExtractedPages} from '../src/lib/extracted-pages';
test('unrelated business identities cannot reuse source branding',()=>{
 assert.equal(matchingSourceBusiness('Baseball','Disney'),false);
 assert.equal(matchingSourceBusiness('Northstar Coffee LLC','Northstar Coffee | Official Website'),true);
});
test('opaque identifiers and exit interstitials never become extracted site pages',()=>{
 const summaries=[
  {path:'/exit',label:'Disney',title:'You Are Now Leaving Disney',headings:[]},
  {path:'/id',label:'6RDVSyxn39NwWm1dw1eCSd5Jqi-MWdAY27OBbcILYy3kki1Lfrd1xjBgRUNS',title:'Redirect',headings:[]},
  {path:'/products',label:'Products',title:'Baseball equipment',headings:['Bats and gloves']},
 ].map(page=>({...page,description:''}));
 assert.equal(usefulSourcePage(summaries[0]),false);
 const pages=createExtractedPages({url:'https://example.com',title:'Baseball',description:'Equipment',headings:[],pageSummaries:summaries},'Baseball');
 assert.deepEqual(pages.map(p=>p.slug),['products']);
 assert.ok(!pages[0].html.includes('6RDVS'));
});

test('an unrelated inspected business switches to clean creation instead of blocking a user',()=>{
 for(const mode of ['inspired','redesign'] as const){
  for(const business of ['Fruit stand','Baseball']){
   assert.deepEqual(resolveGenerationSourceMode(mode,business,'Disney Home'),{mode:'new',discardUnrelatedSource:true});
  }
  assert.deepEqual(resolveGenerationSourceMode(mode,'Disney Home','Disney Home'),{mode,discardUnrelatedSource:false});
  assert.deepEqual(resolveGenerationSourceMode(mode,'Northstar Coffee LLC','Northstar Coffee | Official Website'),{mode,discardUnrelatedSource:false});
 }
 assert.deepEqual(resolveGenerationSourceMode('new','Fruit stand','Disney Home'),{mode:'new',discardUnrelatedSource:false});
 assert.deepEqual(resolveGenerationSourceMode('redesign','','Disney Home'),{mode:'redesign',discardUnrelatedSource:false});
});

test('observed catalog survives broad recognition without inventing offerings',()=>{
 const navigation=[{label:'Shop now',path:'/sale'},{label:'TV & Home Theater',path:'/tv'},{label:'Computers & Tablets',path:'/computers'},{label:'Support',path:'/support'},{label:'Exclusive Member Deals',path:'/members'}];
 const images=navigation.filter(p=>p.label!=='Support').map(p=>({alt:p.label,role:'content'}));
 assert.deepEqual(observedCatalogOfferings(navigation,images),['TV & Home Theater','Computers & Tablets']);
 assert.deepEqual(observedCatalogOfferings(navigation,[{alt:'Computers & Tablets',role:'logo'}]),[]);
});

test('ambiguous shared name tokens cannot carry an unrelated brand into Preserve Style',()=>{
 assert.equal(matchingSourceBusiness('Best Buy','Best Dentistry'),false);
 assert.equal(matchingSourceBusiness('Best Buy','Buy Gold'),false);
 assert.equal(matchingSourceBusiness('Northstar Coffee','Northstar Books'),false);
 assert.equal(matchingSourceBusiness('Best Buy','BestBuy'),true);
 assert.equal(matchingSourceBusiness('Best Buy','Best Buy Official Store'),true);
 assert.equal(matchingSourceBusiness('Tamberinos Pizza','Tamberinos'),true);
 assert.equal(matchingSourceBusiness('Disney','Walt Disney Company'),true);
 assert.deepEqual(resolveGenerationSourceMode('inspired','Best Buy','Best Dentistry'),{mode:'new',discardUnrelatedSource:true});
 assert.deepEqual(resolveGenerationSourceMode('redesign','Best Buy','Best Buy Official Store'),{mode:'redesign',discardUnrelatedSource:false});
});
