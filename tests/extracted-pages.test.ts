import {test} from 'node:test';
import type {SourceImage} from '../src/lib/website-design-dna';
import assert from 'node:assert/strict';
import {createExtractedPages,applyExtractedExperience} from '../src/lib/extracted-pages';
const summary=(path:string)=>({path,label:path,title:'Page <title>',description:'Business & details',headings:['Offerings <script>']});
test('extracted filenames remain unique and every generated navigation target exists',()=>{
 const pages=createExtractedPages({url:'https://example.com',title:'Studio',description:'Design',headings:[],pageSummaries:['/news/events','/news-events','/news-events/','/about','/','https://other.example/offsite','/team?sort=a','/team?sort=b'].map(summary)},'Harbor Studio');
 assert.deepEqual(pages.map(page=>page.slug),['news-events','news-events-2','team']);
 const allowed=new Set(['index','services','about','contact',...pages.map(page=>page.slug)]);
 for(const page of pages){
  for(const [,slug] of page.html.matchAll(/href="([a-z0-9-]+)\.html"/g))assert.ok(allowed.has(slug),slug);
  assert.ok(!page.html.includes('<script>'));assert.ok(page.html.includes('&lt;script&gt;'));
 }
});
test('all extracted pages retain the chosen business-specific navigation experience',()=>{
 const pages=createExtractedPages({url:'https://example.com',title:'Coffee',description:'Beans',headings:[],pageSummaries:[summary('/portfolio'),summary('/team')]},'Harbor Coffee');
 const business={industry:'Coffee shop',services:['Coffee beans','Ceramic mugs']};
 for(const page of applyExtractedExperience(pages,'object-navigation',business)){
  assert.match(page.html,/href="index.html">Harbor Coffee/);assert.match(page.html,/forge-object-navigation-controller/);
  assert.match(page.html,/services.html#offering-0/);assert.match(page.html,/services.html#offering-1/);
 }
 for(const page of applyExtractedExperience(pages,'cinematic',business))assert.match(page.html,/forge-cinematic-controller/);
 for(const page of applyExtractedExperience(pages,'standard',business)){assert.match(page.html,/forge-extracted-business-theme/);assert.match(page.html,/Harbor Coffee/);assert.ok(!page.html.includes('forge-object-navigation-controller'));}
});
test('extracted pages keep source facts, direct source navigation and responsive useful structure',()=>{
 const pages=createExtractedPages({url:'https://example.com',title:'Harbor',description:'',headings:[],pageSummaries:[{path:'/coffee-beans',label:'Coffee beans',title:'Our coffee beans',description:'Single origin beans roasted here.',headings:['Small batch roasting','Coffee subscriptions']}]},'Harbor Coffee');
 const [page]=applyExtractedExperience(pages,'standard',{industry:'Coffee shop',services:['Coffee beans']});
 assert.match(page.html,/Single origin beans roasted here\./);
 assert.match(page.html,/<h2>Small batch roasting<\/h2>/);
 assert.match(page.html,/data-extracted-visual/);
 assert.match(page.html,/Illustrative image/);
 assert.match(page.html,/href="https:\/\/example.com\/coffee-beans"/);
 assert.match(page.html,/<footer class="site-footer">/);
 assert.match(page.html,/<details><summary>Source and reconstruction details/);
 assert.match(page.html,/@media\(max-width:700px\)/);
 assert.doesNotMatch(page.html,/<p>Reconstructed content summary/);
});
test('unrecognized page subjects never inherit arbitrary industry photos or invented content',()=>{
 const pages=createExtractedPages({url:'https://example.com',title:'Harbor',description:'',headings:[],pageSummaries:[{path:'/stay-connected',label:'Stay connected',title:'Stay connected',description:'',headings:['Our newsletter']} ,{path:'/wings',label:'Wings',title:'Wings',description:'',headings:['Chicken wings']}]},'Harbor Pizza');
 for(const page of applyExtractedExperience(pages,'standard',{industry:'Pizza restaurant',services:['Pizza','Wings']})){
  assert.doesNotMatch(page.html,/<img /);
  assert.doesNotMatch(page.html,/Content extracted from a public page; verify before publishing\./);
  assert.doesNotMatch(page.html,/Contact details are being updated|Learn more about/);
 }
});
test('secondary pages render real extracted body copy and page-specific source images before stock',()=>{
 const pages=createExtractedPages({url:'https://example.com',title:'Harbor',description:'',headings:[],pageSummaries:[{path:'/menu',label:'Menu',title:'Our menu',description:'Freshly made here.',headings:['Pizza and wings'],paragraphs:['Our wings are baked to order.','Our wings are baked to order.','Ask our team about available sauces.'],images:[{url:'https://cdn.example.com/wings.webp',alt:'Our baked wings & sauce',role:'content',sourcePage:'https://example.com/menu',width:1200,height:800},{url:'https://cdn.example.com/dining.webp',alt:'Dining room',role:'content',sourcePage:'https://example.com/menu'}]}]},'Harbor Pizza');
 const [page]=applyExtractedExperience(pages,'standard',{industry:'Pizza restaurant',services:['Pizza','Wings']});
 assert.match(page.html,/<p>Our wings are baked to order\.<\/p>/);
 assert.equal((page.html.match(/Our wings are baked to order\./g)||[]).length,1);
 assert.match(page.html,/src="https:\/\/cdn.example.com\/wings.webp" alt="Our baked wings &amp; sauce"/);
 assert.match(page.html,/extracted-gallery/);
 assert.match(page.html,/src="https:\/\/cdn.example.com\/dining.webp"/);
 assert.match(page.html,/Image from <a href="https:\/\/example.com\/menu"/);
 assert.doesNotMatch(page.html,/images.unsplash.com/);
});
test('source image rendering rejects unsafe URLs, foreign page context, tracking sizes and logos',()=>{
 const badImages=[
  {url:'javascript:alert(1)',sourcePage:'https://example.com/menu'},
  {url:'https://127.0.0.1/image.jpg',sourcePage:'https://example.com/menu'},
  {url:'https://user:password@cdn.example.com/image.jpg',sourcePage:'https://example.com/menu'},
  {url:'https://cdn.example.com/elsewhere.jpg',sourcePage:'https://example.com/other'},
  {url:'https://cdn.example.com/foreign.jpg',sourcePage:'https://other.example.com/menu'},
  {url:'https://cdn.example.com/pixel.png',sourcePage:'https://example.com/menu',width:1,height:1},
 ];
 const images:SourceImage[]=[...badImages.map(image=>({...image,alt:'Untrusted',role:'content' as const})),{url:'https://cdn.example.com/logo.png',sourcePage:'https://example.com/menu',alt:'Logo',role:'logo'}];
 const pages=createExtractedPages({url:'https://example.com',title:'Harbor',description:'',headings:[],pageSummaries:[{path:'/menu',label:'Menu',title:'Menu',description:'',headings:[],paragraphs:['Text <script>alert(1)</script> remains text.'],images}]},'Harbor');
 assert.doesNotMatch(pages[0].html,/<img /);
 assert.doesNotMatch(pages[0].html,/<script>/);
 assert.match(pages[0].html,/Text &lt;script&gt;/);
});
