import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {validateBrowserEvidence} from './browser-evidence';
const base={version:1,sourceUrl:'https://example.com',capturedAt:'2026-11-06T00:00:00Z',viewport:{width:1280,height:800},pages:[{path:'/',title:'Example',landmarks:[{role:'h1',text:'Example'}],interactions:[]}],warnings:[]};
test('accepts bounded browser evidence',()=>assert.equal(validateBrowserEvidence(base),true));
test('rejects malformed capture timestamps',()=>assert.equal(validateBrowserEvidence({...base,capturedAt:'invalid'}),false));
test('rejects oversized landmarks',()=>assert.equal(validateBrowserEvidence({...base,pages:[{...base.pages[0],landmarks:[{role:'h1',text:'x'.repeat(501)}]}]}),false));
test('rejects credentialed source URLs',()=>assert.equal(validateBrowserEvidence({...base,sourceUrl:'https://user:password@example.com'}),false));

test('accepts bounded interaction summary without implying execution',()=>{
 const summary={observed:1,links:1,buttons:0,forms:0,unlabeledControls:0,linksWithoutTargets:0,interactionsExecuted:false};
 assert.equal(validateBrowserEvidence({...base,pages:[{...base.pages[0],interactions:[{kind:'link',label:'Home',target:'/',verified:false}],interactionSummary:summary}]}),true);
});
test('rejects claimed execution in static interaction summary',()=>{
 const summary={observed:1,links:1,buttons:0,forms:0,unlabeledControls:0,linksWithoutTargets:0,interactionsExecuted:true};
 assert.equal(validateBrowserEvidence({...base,pages:[{...base.pages[0],interactionSummary:summary}]}),false);
});

test('accepts bounded read-only navigation probe results',()=>{
 const navigationChecks=[{path:'/about',status:200,ok:true,verifiedBy:'navigation-get'}];
 assert.equal(validateBrowserEvidence({...base,pages:[{...base.pages[0],navigationChecks}]}),true);
});
test('rejects fabricated navigation check methods',()=>{
 const navigationChecks=[{path:'/checkout',status:200,ok:true,verifiedBy:'form-submit'}];
 assert.equal(validateBrowserEvidence({...base,pages:[{...base.pages[0],navigationChecks}]}),false);
});

test('rejects navigation probes with success flags inconsistent with status',()=>{
 const navigationChecks=[{path:'/missing',status:404,ok:true,verifiedBy:'navigation-get'}];
 assert.equal(validateBrowserEvidence({...base,pages:[{...base.pages[0],navigationChecks}]}),false);
});


test('accepts bounded computed browser design tokens and rejects CSS injection',()=>{
 const tokens={backgroundColor:'rgb(20, 34, 48)',textColor:'rgb(245, 245, 245)',fontFamily:'"Source Sans", sans-serif',headingFontFamily:'Georgia, serif',headingFontSize:'44px',baseFontSize:'16px'};
 const page={...base.pages[0],designTokens:tokens};
 assert.equal(validateBrowserEvidence({...base,pages:[page]}),true);
 for(const [key,value] of [['backgroundColor','rgb(0, 0, 0);background:url(https://evil.example)'],['fontFamily','Arial;}</style><script>bad()</script>'],['headingFontSize','9999px']]){
  assert.equal(validateBrowserEvidence({...base,pages:[{...page,designTokens:{...tokens,[key]:value}}]}),false,String(key));
 }
});


test('long-page browser captures retain below-fold regions within bounded full-page limits',()=>{
 const longPage={...base.pages[0],visualRegions:[{role:'hero',x:0,y:0,width:900,height:420},{role:'section',x:0,y:2400,width:900,height:600}]};
 assert.equal(validateBrowserEvidence({...base,pages:[longPage]}),true,'read-only browser worker may capture content below 800px viewport');
 assert.equal(validateBrowserEvidence({...base,pages:[{...longPage,visualRegions:[{role:'section',x:0,y:21000,width:900,height:200}]}]}),false,'out-of-bounds page geometry rejected');
 assert.equal(validateBrowserEvidence({...base,pages:[{...longPage,visualRegions:[{role:'section',x:0,y:900,width:1400,height:200}]}]}),false,'off-viewport horizontal geometry rejected');
});
