import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGN_PATTERNS,planAdaptiveDesign} from './index';
test('catalog has unique IDs and original license metadata',()=>{
 assert.equal(new Set(DESIGN_PATTERNS.map(p=>p.id)).size,DESIGN_PATTERNS.length);
 assert.ok(DESIGN_PATTERNS.every(p=>p.license==='original'));
});
test('auto design matches coffee instead of unrelated automotive',()=>{
 const result=planAdaptiveDesign({businessName:'Coffee House',industry:'coffee shop',immersive3d:true});
 assert.equal(result.patternId,'hospitality-story');assert.equal(result.immersive3d,true);
});
test('clinical services remain accessible without forced 3D',()=>{
 const result=planAdaptiveDesign({businessName:'Dental Care',industry:'dental clinic',immersive3d:true});
 assert.equal(result.patternId,'trusted-services');assert.equal(result.immersive3d,false);
 assert.ok(result.warnings.length);
});
test('manual selection and invalid IDs are explicit',()=>{
 assert.equal(planAdaptiveDesign({businessName:'Example',industry:'retail',mode:'library',patternId:'product-showcase'}).patternId,'product-showcase');
 assert.throws(()=>planAdaptiveDesign({businessName:'Example',industry:'retail',mode:'library',patternId:'missing'}));
});
