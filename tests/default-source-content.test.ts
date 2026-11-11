import test from 'node:test';
import assert from 'node:assert/strict';
import {applyDefaultSourceContent,defaultSourcePages} from '../src/lib/default-source-content';
import {homepageSourceParagraphs} from '../src/lib/forge-intelligence';
import {extractedPageSources} from '../src/lib/extracted-pages';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';
const text='Our studio develops accessible spaces for neighborhood businesses.';
const summary=(path:string)=>({path,title:'Studio',label:'About',description:'Observed description',headings:[],paragraphs:[text,text]});
const evidence={url:'https://studio.example/',title:'Studio',description:'Studio design',headings:[],pageSummaries:[summary('/about?lang=en'),summary('/services'),summary('/contact')]};
const pages=['index','about','services','contact'].map(slug=>({slug,title:slug,html:'<html><head></head><body><nav>Navigation</nav><main><h1>'+slug+'</h1></main></body></html>'}));
test('preserve and redesign retain distinct inspected default-page text without changing pages or navigation',()=>{
 for(const mode of ['preserve','inspired','redesign']){
  const result=applyDefaultSourceContent(pages,evidence,mode);
  assert.deepEqual(result.pages.map(p=>p.slug),pages.map(p=>p.slug));
  assert.equal(result.pages[0].html,pages[0].html);
  for(const page of result.pages.slice(1)){
   assert.equal(page.html.split(text).length-1,1);
   assert.match(page.html,/<nav>Navigation<\/nav>/);
   assert.match(page.html,/View original page/);
  }
  assert.equal(result.warnings.length,1);
  assert.deepEqual(applyDefaultSourceContent(result.pages,evidence,mode).pages,result.pages);
 }
 assert.deepEqual(applyDefaultSourceContent(pages,evidence,'new'),{pages,warnings:[]});
 assert.equal(pages[1].html.includes(text),false);
});
test('only exact same-origin, uncredentialed, unambiguous source routes can supply default facts',()=>{
 const invalid={...evidence,pageSummaries:['https://foreign.example/about','https://name:password@studio.example/contact','/team','/about?x=1','/about?x=2'].map(summary)};
 assert.deepEqual(defaultSourcePages(invalid),[]);
 assert.deepEqual(applyDefaultSourceContent(pages,invalid,'preserve').pages,pages);
});
test('source markup is escaped; output is bounded and never imports a functional form',()=>{
 const malicious={...evidence,pageSummaries:[{...summary('/about'),paragraphs:['<form action="https://evil.example"><script>alert(1)</script></form>',...Array.from({length:30},(_,i)=>String(i)+'x'.repeat(2000))]}]};
 const html=applyDefaultSourceContent(pages,malicious,'redesign').pages[1].html;
 assert.doesNotMatch(html,/<form|<script|action="https/);
 assert.match(html,/&lt;form/);
 assert.equal((html.match(/<p>/g)||[]).length,13);
 assert.ok(html.length<16000);
});
test('existing exact paragraph text is not repeated and stale owned text is removed',()=>{
 const once=applyDefaultSourceContent(pages,evidence,'preserve');
 const updated={...evidence,pageSummaries:[{...summary('/about'),paragraphs:['about']}]};
 const second=applyDefaultSourceContent(once.pages,updated,'preserve').pages[1].html;
 assert.doesNotMatch(second,/data-forge-source-copy/);
 const existing=pages.map(p=>({...p,html:p.html.replace('</main>','<p>'+text+'</p></main>')}));
 assert.equal(applyDefaultSourceContent(existing,evidence,'preserve').pages[1].html,existing[1].html);
});
test('default source identity also selects exact matching captured styles',()=>{
 const tokens={backgroundColor:'#ffffff',textColor:'#111111',fontFamily:'Georgia, serif',headingFontFamily:'Georgia, serif',headingFontSize:'48px',baseFontSize:'17px'};
 const capture={version:1,sourceUrl:evidence.url,capturedAt:'2026-11-11T12:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{path:'/',title:'Home',landmarks:[],interactions:[],designTokens:tokens},{path:'/about?lang=en',title:'About',landmarks:[],interactions:[],designTokens:{...tokens,backgroundColor:'#ddeeff'}}]};
 const content=applyDefaultSourceContent(pages,evidence,'preserve');
 const result=applyCapturedAppearance(content.pages,capture,evidence.url,'preserve',extractedPageSources(evidence));
 assert.match(result.pages[1].html,/--business-paper:#ddeeff/);
 assert.match(result.pages[0].html,/--business-paper:#ffffff/);
});

test('private, literal-IP and nonstandard-port roots cannot create source navigation links',()=>{
 for(const url of ['https://localhost/','https://127.0.0.1/','https://studio.internal/','https://studio.example:8443/','http://studio.example/']){
  const unsafe={...evidence,url};
  assert.deepEqual(defaultSourcePages(unsafe),[]);
  assert.deepEqual(applyDefaultSourceContent(pages,unsafe,'preserve').pages,pages);
 }
});

test('source form instructions cannot advertise a nonexistent form while factual services remain',()=>{
 const original={...evidence,pageSummaries:[{...summary('/contact'),paragraphs:['Please fill out the form below to reach our team.','Use our online contact form for booking.','Our office supports neighborhood businesses.']},{...summary('/services'),paragraphs:['Tax form preparation services for local businesses.']}]};
 const result=applyDefaultSourceContent(pages,original,'redesign');
 assert.doesNotMatch(result.pages[3].html,/fill out|online contact form/);
 assert.match(result.pages[3].html,/Our office supports neighborhood businesses/);
 assert.match(result.pages[2].html,/Tax form preparation services/);
 assert.ok(result.warnings.some(w=>w.includes('form instructions were omitted')));
});

test('excluded-business paragraphs cannot enter copied default pages after AI brief screening',()=>{
 const inspected={...evidence,pageSummaries:[
  {...summary('/about'),paragraphs:['Our studio supports local families.','We also operate adult entertainment services.']},
  {...summary('/services'),paragraphs:['Order recreational drugs from our catalog.','Book an accessible building design consultation.']},
  {...summary('/contact'),paragraphs:['Our pharmacy offers prescription support to patients.']}
 ]};
 for(const mode of ['preserve','inspired','redesign']){
  const result=applyDefaultSourceContent(pages,inspected,mode);
  assert.match(result.pages[1].html,/Our studio supports local families/);
  assert.doesNotMatch(result.pages[1].html,/adult entertainment/);
  assert.match(result.pages[2].html,/accessible building design consultation/);
  assert.doesNotMatch(result.pages[2].html,/recreational drugs/);
  assert.match(result.pages[3].html,/pharmacy offers prescription support/);
  assert.ok(result.warnings.some(w=>w.includes('excluded business categories')));
 }
 assert.deepEqual(applyDefaultSourceContent(pages,inspected,'new'),{pages,warnings:[]});
});

test('sole excluded paragraph is omitted without creating a misleading original-page section',()=>{
 const inspected={...evidence,pageSummaries:[{...summary('/services'),paragraphs:['Visit our cannabis shop.']}]};
 const result=applyDefaultSourceContent(pages,inspected,'redesign');
 assert.equal(result.pages[2].html,pages[2].html);
 assert.ok(result.warnings.some(w=>w.includes('excluded business categories')));
});

test('homepage extraction retains bounded visible paragraphs without scripts, forms or duplicates',()=>{
 const html='<html><body><p>Outside main content should not be selected.</p><main><script><p>Malicious script paragraph content.</p></script><form><p>Do not copy this unhosted form text.</p></form><p>Our local studio designs welcoming community spaces.</p><p>Our local studio designs welcoming community spaces.</p><p>Short</p><p>Visit our studio for a consultation with our design team.</p></main></body></html>';
 assert.deepEqual(homepageSourceParagraphs(html),['Our local studio designs welcoming community spaces.','Visit our studio for a consultation with our design team.']);
 assert.deepEqual(homepageSourceParagraphs('<body><p>Our neighborhood bakery serves fresh bread every day.</p></body>'),['Our neighborhood bakery serves fresh bread every day.']);
 const many='<main>'+Array.from({length:40},(_,i)=>'<p>Our studio offers distinct service number '+i+'.</p>').join('')+'</main>';
 assert.equal(homepageSourceParagraphs(many).length,12);
});

test('inspected homepage facts are retained only on the generated home page in source-based modes',()=>{
 const home={...evidence,homepageParagraphs:['Our bakery serves handmade bread to neighborhood families.','Our bakery serves handmade bread to neighborhood families.','Order recreational drugs from our shop.','Please fill out the form below for bookings.']};
 for(const mode of ['preserve','inspired','redesign']){
  const result=applyDefaultSourceContent(pages,home,mode);
  assert.equal(result.pages[0].html.split('Our bakery serves handmade bread').length-1,1);
  assert.doesNotMatch(result.pages[0].html,/recreational drugs|fill out the form/);
  assert.match(result.pages[0].html,/View original page/);
  assert.doesNotMatch(result.pages[1].html,/Our bakery serves handmade bread/);
  assert.deepEqual(applyDefaultSourceContent(result.pages,home,mode).pages,result.pages);
  assert.ok(result.warnings.some(w=>w.includes('excluded business categories')));
 }
 assert.deepEqual(applyDefaultSourceContent(pages,home,'new'),{pages,warnings:[]});
});

test('unsafe or non-root homepage URLs cannot inject copied homepage text',()=>{
 for(const url of ['https://127.0.0.1/','https://studio.example:8443/','https://studio.example/other','https://studio.example/?page=2']){
  const result=applyDefaultSourceContent(pages,{...evidence,url,homepageParagraphs:['Our bakery serves handmade bread to neighborhood families.']},'preserve');
  assert.equal(result.pages[0].html,pages[0].html);
 }
});
