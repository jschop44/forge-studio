import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';

const pages=[{slug:'index',html:'<html><head></head><body><h1>Shop</h1></body></html>'}];
const tokens={backgroundColor:'rgb(20, 34, 48)',textColor:'rgb(250, 250, 250)',fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',headingFontSize:'48px',baseFontSize:'16px'};
const capture={version:1,sourceUrl:'https://shop.example/',capturedAt:'2026-11-11T01:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{path:'/',title:'Shop home',landmarks:[],interactions:[],designTokens:tokens}]};

test('source-style preservation rejects styling from a different page on the same domain',()=>{
 const misleading={...capture,pages:[{...capture.pages[0],path:'/products'}]};
 const result=applyCapturedAppearance(pages,misleading,'https://shop.example/','inspired');
 assert.deepEqual(result.pages,pages);
 assert.ok(result.warnings.some(warning=>warning.includes('inspected source page')));
});
test('source-style preservation accepts an exact captured path including the original query',()=>{
 const evidence={...capture,pages:[{...capture.pages[0],path:'/catalog?type=coffee'}]};
 const found=applyCapturedAppearance(pages,evidence,'https://shop.example/catalog?type=coffee','inspired');
 assert.match(found.pages[0].html,/--business-paper:#142230/);
 const wrongQuery=applyCapturedAppearance(pages,evidence,'https://shop.example/catalog?type=baseball','inspired');
 assert.deepEqual(wrongQuery.pages,pages);
});
test('preserve mode still supports valid homepage captures, while redesign ignores them',()=>{
 const preserved=applyCapturedAppearance(pages,capture,capture.sourceUrl,'inspired');
 assert.match(preserved.pages[0].html,/forge-captured-appearance/);
 assert.deepEqual(applyCapturedAppearance(pages,capture,capture.sourceUrl,'redesign').pages,pages);
});


test('protocol-relative or missing page paths cannot supply a fallback style',()=>{
 const offsite={...capture,pages:[{...capture.pages[0],path:'//other.example/products'}]};
 assert.deepEqual(applyCapturedAppearance(pages,offsite,capture.sourceUrl,'inspired').pages,pages);
 const empty={...capture,pages:[]};
 assert.deepEqual(applyCapturedAppearance(pages,empty,capture.sourceUrl,'inspired').pages,pages);
});

test('extracted page source identities select their own captured styles including query strings',async()=>{
 const {createExtractedPages,extractedPageSources}=await import('../src/lib/extracted-pages');
 const evidence={url:'https://shop.example/',title:'Shop',description:'',headings:[],pageSummaries:[{path:'/catalog?type=coffee',label:'Catalog',title:'Coffee',description:'Coffee beans',headings:['Beans']},{path:'/catalog-special',label:'Special',title:'Special',description:'Special beans',headings:['Special']}]};
 const extracted=createExtractedPages(evidence,'Shop');
 const distinct={...tokens,backgroundColor:'#f0e0d0',textColor:'#111111',fontFamily:'Courier New, monospace'};
 const captured={...capture,pages:[...capture.pages,{...capture.pages[0],path:'/catalog?type=coffee',designTokens:distinct}]};
 const result=applyCapturedAppearance([...pages,...extracted],captured,evidence.url,'preserve',extractedPageSources(evidence));
 assert.match(result.pages[0].html,/--business-paper:#142230/);
 assert.match(result.pages[1].html,/--business-paper:#f0e0d0/);
 assert.match(result.pages[1].html,/font-family:"Courier New",monospace/);
 assert.match(result.pages[2].html,/--business-paper:#142230/);
 assert.ok(result.warnings.some(w=>w.includes('shared source branding')));
 assert.deepEqual(Object.keys(result.pages[1]).sort(),['html','slug','title']);
});
test('foreign, credentialed and wrong-query source mappings cannot select captured styles',()=>{
 const captured={...capture,pages:[...capture.pages,{...capture.pages[0],path:'/catalog?type=coffee',designTokens:{...tokens,backgroundColor:'#f0e0d0'}}]};
 for(const source of ['https://other.example/catalog?type=coffee','https://name:password@shop.example/catalog?type=coffee','https://shop.example/catalog?type=baseball','not a URL']){
  const result=applyCapturedAppearance(pages,captured,capture.sourceUrl,'preserve',{index:source});
  assert.match(result.pages[0].html,/--business-paper:#142230/);
  assert.doesNotMatch(result.pages[0].html,/--business-paper:#f0e0d0/);
  assert.ok(result.warnings.some(w=>w.includes('shared source branding')));
 }
});
test('source mapping shares the collision-safe extracted page allocator',async()=>{
 const {createExtractedPages,extractedPageSources}=await import('../src/lib/extracted-pages');
 const summary=(path:string)=>({path,label:path,title:path,description:'',headings:[]});
 const evidence={url:'https://shop.example/',title:'Shop',description:'',headings:[],pageSummaries:['/a/b','/a-b','/about','https://foreign.example/a'].map(summary)};
 const extracted=createExtractedPages(evidence,'Shop');
 assert.deepEqual(extracted.map(p=>p.slug),['a-b','a-b-2']);
 assert.deepEqual(extractedPageSources(evidence),{'a-b':'https://shop.example/a/b','a-b-2':'https://shop.example/a-b',about:'https://shop.example/about'});
});

test('a captured subpage remains usable when the inspected homepage has no computed tokens',()=>{
 const captured={...capture,pages:[{path:'/',title:'Home',landmarks:[],interactions:[]},{...capture.pages[0],path:'/catalog',designTokens:tokens}]};
 const inputs=[...pages,{slug:'catalog',html:'<html><head></head><body>Catalog</body></html>'}];
 const result=applyCapturedAppearance(inputs,captured,capture.sourceUrl,'preserve',{catalog:'https://shop.example/catalog'});
 assert.equal(result.pages[0].html,inputs[0].html);
 assert.match(result.pages[1].html,/--business-paper:#142230/);
});
