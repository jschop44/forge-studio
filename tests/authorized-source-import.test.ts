import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareSavedSourceInspection} from '../src/lib/authorized-source-import';

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
 assert.deepEqual(data.navigation.map(x=>x.path),['/products','/about','/support']);
 assert.equal(data.pageSummaries.length,3);
 assert.equal(data.pageSummaries[0].title,'Products | Northstar Electronics');
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
