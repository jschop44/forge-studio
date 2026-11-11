import test from 'node:test';
import assert from 'node:assert/strict';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';
import {mergeObservedStyleEvidence} from '../src/lib/observed-source-style';

const home=extractWebsiteDesignDna('<img src="/logo.svg" alt="Harbor Coffee logo"><style>body{background:#fafafa;font-family:Georgia}</style>','https://coffee.example/');
const tokens={backgroundColor:'rgb(20, 34, 48)',textColor:'rgb(250, 250, 250)',fontFamily:'"Verdana", sans-serif',headingFontFamily:'Georgia, serif',headingFontSize:'48px',baseFontSize:'16px'};
const capture={version:1,sourceUrl:'https://coffee.example/',capturedAt:'2026-11-11T01:00:00Z',viewport:{width:1280,height:800},pages:[{path:'/',title:'Harbor Coffee',landmarks:[],interactions:[],designTokens:tokens}],warnings:[]};

test('preserve mode reuses same-origin measured background and font without losing source assets',()=>{
 const merged=mergeObservedStyleEvidence(home,capture,'inspired');
 assert.equal(merged.palette[0],'#142230');
 assert.equal(merged.typography.families[0],'Verdana, sans-serif');
 assert.equal(merged.logo?.url,'https://coffee.example/logo.svg');
 assert.ok(merged.warnings.some(warning=>warning.includes('Exact')||warning.includes('exact')));
 assert.equal(home.palette[0],'#fafafa','original captured DNA is unchanged');
});
test('redesign and scratch modes never import the observed style from pasted browser evidence',()=>{
 assert.equal(mergeObservedStyleEvidence(home,capture,'redesign'),home);
 assert.equal(mergeObservedStyleEvidence(home,capture,'new'),home);
});
test('unrelated origins or unverifiable tokens cannot style the generated website',()=>{
 assert.equal(mergeObservedStyleEvidence(home,{...capture,sourceUrl:'https://other.example/'},'inspired'),home);
 assert.equal(mergeObservedStyleEvidence(home,{...capture,pages:[{...capture.pages[0],path:'//other.example/'}]},'inspired'),home);
 assert.equal(mergeObservedStyleEvidence(home,{...capture,pages:[{...capture.pages[0],designTokens:{...tokens,backgroundColor:'red;}</style><script>bad()</script>'}}]},'inspired'),home);
});
test('transparent or invalid opaque backgrounds cannot become source color tokens',()=>{
 const transparent={...capture,pages:[{...capture.pages[0],designTokens:{...tokens,backgroundColor:'rgba(0, 0, 0, 0)'}}]};
 const merged=mergeObservedStyleEvidence(home,transparent,'inspired');
 assert.equal(merged.palette[0],home.palette[0]);
 assert.equal(merged.typography.families[0],'Verdana, sans-serif');
});
