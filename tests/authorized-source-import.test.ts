import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareSavedSourceInspection} from '../src/lib/authorized-source-import';
import {applyDefaultSourceContent} from '../src/lib/default-source-content';

const page=(title:string,body:string,description='')=>
 '<!doctype html><html><head><title>'+title+'</title>'+
 (description?'<meta name="description" content="'+description+'">':'')+
 '</head><body>'+body+'</body></html>';

test('authorized saved pages reconstruct bounded multi-page metadata without fetching blocked websites',()=>{
 const source=[
  {name:'index.html',html:page('Northstar Electronics | Home','<header><img alt="Northstar Electronics logo" src="/logo.png"></header><main><h1>Electronics for everyone</h1><p>Our stores carry computers and appliances.</p><a href="/products">Shop products</a></main>','Consumer electronics, televisions, and laptops')},
  {name:'products.html',html:page('Products | Northstar Electronics','<main><h1>Product categories</h1><p>Find laptop computers and electronics accessories.</p><img alt="Laptop computers" src="/laptops.jpg" width="1200" height="800"></main>')},
  {name:'about.html',html:page('About | Northstar Electronics','<main><h1>Our story</h1><p>An independent electronics store.</p></main>')},
  {name:'support.html',html:page('Support | Northstar Electronics','<main><h1>Customer support</h1><p>Get assistance with purchases.</p></main>')}
 ];
 const data=prepareSavedSourceInspection(source,'retail.example');
 assert.equal(data.url,'https://retail.example/');
 assert.equal(data.title,'Northstar Electronics | Home');
 assert.equal(data.description,'Consumer electronics, televisions, and laptops');
 assert.deepEqual(data.homepageParagraphs,['Our stores carry computers and appliances.']);
 assert.deepEqual(data.navigation.map(x=>x.path),['/products','/about','/support']);
 assert.equal(data.pageSummaries.length,3);
 assert.equal(data.pageSummaries[0].title,'Products | Northstar Electronics');
 assert.equal(data.pageSummaries[0].label,'Products','trailing company name delimiters must not leak into navigation');
 assert.equal(data.pageSummaries[0].paragraphs[0],'Find laptop computers and electronics accessories.');
 assert.ok(data.designDna.images.some(x=>x.url==='https://retail.example/laptops.jpg'));
 assert.match(data.referenceMarkup,/Electronics for everyone/);
 assert.ok(data.warnings.some(x=>x.includes('did not fetch')));
 assert.ok(data.warnings.some(x=>x.includes('not a license')));
 assert.equal(data.stylesheetsRead,0);
});

test('import accepts a single HTML page and treats embedded scripts as inert source text',()=>{
 const data=prepareSavedSourceInspection([{name:'home.htm',html:page('Bookstore Example','<main><h1>Stories and books</h1><p>Discover our locally owned bookshop.</p><script>globalThis.hijacked=true</script></main>')}],'https://books.example/');
 assert.equal(data.url,'https://books.example/');
 assert.equal(data.pageSummaries.length,0);
 assert.deepEqual(data.navigation,[]);
 assert.equal((globalThis as {hijacked?:boolean}).hijacked,undefined);
});

test('authorized page import rejects duplicate names, private URLs, non-HTML and oversized content',()=>{
 const html=page('Shop','<main><h1>Store</h1></main>');
 const pages=[{name:'index.html',html}];
 assert.throws(()=>prepareSavedSourceInspection(pages,'http://retail.example/'),/public HTTPS/);
 assert.throws(()=>prepareSavedSourceInspection(pages,'https://username:secret@retail.example/'),/public HTTPS/);
 assert.throws(()=>prepareSavedSourceInspection(pages,'https://127.0.0.1/'),/public HTTPS/);
 assert.throws(()=>prepareSavedSourceInspection(pages,'https://intranet.local/'),/public HTTPS/);
 assert.throws(()=>prepareSavedSourceInspection([{name:'unsafe.svg',html}],'retail.example'),/Only saved/);
 assert.throws(()=>prepareSavedSourceInspection([{name:'index.html',html:'<script>fake()</script>'}],'retail.example'),/recognizable HTML/);
 assert.throws(()=>prepareSavedSourceInspection([...pages,{name:'home.html',html}],'retail.example'),/same filename-derived route/);
 assert.throws(()=>prepareSavedSourceInspection(Array.from({length:7},(_,i)=>({name:'page-'+i+'.html',html})),'retail.example'),/one and six/);
 assert.throws(()=>prepareSavedSourceInspection([{name:'index.html',html:html+' '.repeat(1_000_000)}],'retail.example'),/smaller than 1 MB/);
});

test('authorized homepage copy survives preserve and redesign without importing scripts or forms',()=>{
 const visible='Our independent neighborhood shop repairs electronics and provides personalized support.';
 const home=page('Northstar Electronics | Home',
  '<main><script><p>Untrusted script text should never appear in the generated website.</p></script>'+
  '<form><p>Fake online booking form instructions should not be copied.</p></form>'+
  '<h1>Northstar electronics service</h1><p>'+visible+'</p></main>');
 const product=page('Products | Northstar Electronics',
  '<main><h1>Reliable electronics</h1><script><p>Untrusted product instructions must not be copied.</p></script>'+
  '<p>We offer trusted laptops and audio accessories for local shoppers.</p></main>');
 const inspected=prepareSavedSourceInspection([{name:'index.html',html:home},{name:'products.html',html:product}],'northstar.example');
 assert.deepEqual(inspected.homepageParagraphs,[visible]);
 assert.deepEqual(inspected.pageSummaries[0].paragraphs,['We offer trusted laptops and audio accessories for local shoppers.']);
 const generated=[{slug:'index',title:'Home',html:'<html><body><main><h1>Home</h1></main></body></html>'},
  {slug:'products',title:'Products',html:'<html><body><main><h1>Products</h1></main></body></html>'}];
 for(const mode of ['inspired','redesign']){
  const result=applyDefaultSourceContent(generated,inspected,mode);
  assert.equal(result.pages[0].html.split(visible).length-1,1);
  assert.doesNotMatch(result.pages[0].html,/Untrusted script|Fake online booking/);
  assert.doesNotMatch(result.pages[1].html,/Untrusted product instructions/);
  assert.match(result.pages[0].html,/View original page/);
  assert.deepEqual(applyDefaultSourceContent(result.pages,inspected,mode).pages,result.pages);
 }
 assert.deepEqual(applyDefaultSourceContent(generated,inspected,'new').pages,generated);
});
