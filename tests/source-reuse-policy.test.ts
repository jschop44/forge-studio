import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchingSourceBusiness,usefulSourcePage} from '../src/lib/source-reuse-policy';
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
