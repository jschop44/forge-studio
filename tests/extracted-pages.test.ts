import {test} from 'node:test';
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
 assert.deepEqual(applyExtractedExperience(pages,'standard',business),pages);
});
