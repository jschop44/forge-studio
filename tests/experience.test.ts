import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {validateAsset} from '../src/lib/asset-policy';
import {makeExperience} from '../src/lib/experiences';
import {reviewExperience,renderExperienceHtml} from '../src/lib/experience-quality';
describe('cinematic 3D builder safety',()=>{
 it('accepts small GLB models with browser fallback MIME',()=>assert.equal(validateAsset({name:'product.glb',type:'application/octet-stream',size:1024}).ok,true));
 it('rejects oversized or dangerous assets',()=>{assert.equal(validateAsset({name:'model.glb',type:'model/gltf-binary',size:13*1024*1024}).ok,false);assert.equal(validateAsset({name:'attack.html',type:'text/html',size:500}).ok,false)});
 it('renders an interactive public 3D model export',()=>{const e=makeExperience('cinematic-product');e.scene.modelUrl='https://example.com/model.glb';const html=renderExperienceHtml(e);assert.ok(html.includes('model-viewer'));assert.ok(html.includes('model-viewer.min.js'))});
 it('does not expose private model assets in public export',()=>{const e=makeExperience('luxury-brand');e.scene.modelUrl='/api/assets/00000000-0000-4000-8000-000000000000';assert.ok(!renderExperienceHtml(e).includes('<model-viewer'))});
 it('flags missing business experience content',()=>{const e=makeExperience('business');e.sections=[];assert.ok(reviewExperience(e).issues.length>0)});
});
