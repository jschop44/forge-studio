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
 it('exports HTTPS product images without executable markup',()=>{const e=makeExperience('cinematic-product');e.scene.object='product-image';e.scene.imageUrl='https://example.com/product.webp';const html=renderExperienceHtml(e);assert.ok(html.includes('<img src="https://example.com/product.webp"'));assert.ok(!html.includes('<script type="module"'))});
 it('flags missing business experience content',()=>{const e=makeExperience('business');e.sections=[];assert.ok(reviewExperience(e).issues.length>0)});
});


describe('experience export destination and mobile safeguards',()=>{
 it('routes a contact CTA to a real contact section even when story is absent',()=>{
  const e=makeExperience('business');
  e.sections=[{id:'overview',title:'Our values',body:'We help local companies.'},{id:'contact',title:'Contact us',body:'Send an inquiry.'}];
  const html=renderExperienceHtml(e);
  assert.ok(html.includes('<a class="experience-cta" href="#contact">Get in touch</a>'));
  assert.ok(html.includes('<section id="contact">'));
  assert.ok(!html.includes('href="#story"'));
 });
 it('removes dead CTA links and reports missing sections',()=>{
  const e=makeExperience('business');
  e.sections=[];
  assert.equal(reviewExperience(e).passed,false);
  const html=renderExperienceHtml(e);
  assert.ok(!html.includes('class="experience-cta"'));
 });
 it('does not render CTA links to duplicate or unsafe section IDs',()=>{
  const e=makeExperience('luxury-brand');
  e.sections=[{id:'overview',title:'Overview',body:'First'},{id:'overview',title:'Other',body:'Second'}];
  assert.equal(reviewExperience(e).passed,false);
  assert.ok(!renderExperienceHtml(e).includes('class="experience-cta"'));
  e.sections[1].id='weird value';
  assert.equal(reviewExperience(e).passed,false);
  assert.ok(!renderExperienceHtml(e).includes('class="experience-cta"'));
 });
 it('exports responsive and keyboard-accessible layout rules',()=>{
  const html=renderExperienceHtml(makeExperience('business'));
  assert.ok(html.includes('padding:clamp(72px,10vw,120px)'));
  assert.ok(html.includes('overflow-wrap:anywhere'));
  assert.ok(html.includes('a:focus-visible'));
  assert.ok(html.includes('min-height:44px'));
 });
});
