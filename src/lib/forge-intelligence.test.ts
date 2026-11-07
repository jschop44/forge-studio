import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {analyzeSiteEvidence,inspectionCoverage} from './forge-intelligence';
test('recognizes entertainment websites from title and metadata',()=>{const result=analyzeSiteEvidence({url:'https://www.disney.com',title:'Disney.com | Disney entertainment',description:'Theme parks, movies, characters and entertainment',headings:['Explore movies','Theme parks']});assert.equal(result.industry,'Entertainment, media and theme parks');assert.notEqual(result.confidence,'low')});
test('does not invent an industry for an unknown business',()=>{const result=analyzeSiteEvidence({url:'https://example.com',title:'Example',description:'A unique organization',headings:[]});assert.equal(result.industry,'General business');assert.equal(result.confidence,'low')});
test('counts successfully inspected pages',()=>{const result=analyzeSiteEvidence({url:'https://example.com',title:'A cafe',description:'Coffee and espresso',headings:[],pageSummaries:[{path:'/menu',label:'Menu',title:'Coffee menu',description:'Espresso',headings:['Coffee menu']}]});assert.equal(result.sourcePages,2)});

test('reports missing visual capture and internal pages',()=>{const coverage=inspectionCoverage({url:'https://example.com',title:'Example',description:'',headings:[]});assert.equal(coverage.visualCapture,false);assert.equal(coverage.internalPages,0);assert.ok(coverage.limitations.some(item=>item.includes('Rendered screenshots')))});

test('marks competing industry signals as ambiguous rather than high confidence',()=>{
 const result=analyzeSiteEvidence({url:'https://example.com',title:'Coffee restaurant pizza cafe',description:'Coffee espresso pizza bakery dining restaurant',headings:['Coffee shop restaurant','Coffee pizza menu']});
 assert.notEqual(result.confidence,'high');
});

test('recognizes pharmacy without conflating legitimate medicine with recreational drugs',()=>{const result=analyzeSiteEvidence({url:'https://example.com',title:'Community Pharmacy',description:'Prescription refills and pharmacist consultations',headings:['Pharmacy services']});assert.equal(result.industry,'Pharmacy');assert.notEqual(result.confidence,'low')});
test('recognizes seasonal family attractions',()=>{const result=analyzeSiteEvidence({url:'https://example.com',title:'Family Pumpkin Patch',description:'Halloween festival and seasonal attraction',headings:['Holiday event activities']});assert.equal(result.industry,'Events and seasonal attractions')});
test('recognizes trade services from specific business evidence',()=>{const result=analyzeSiteEvidence({url:'https://example.com',title:'Reliable Roofing Contractors',description:'Roofing and home renovation services',headings:['Roofing estimates']});assert.equal(result.industry,'Home and trade services')});
