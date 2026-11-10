import test from 'node:test';
import assert from 'node:assert/strict';
import {immersiveWorldMarkup} from '../workers/immersive-world.mjs';
const targets=['index','services','about','contact'].map(slug=>({slug,title:slug,active:slug==='index'}));
const environment={kind:'panorama',url:'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/comfy_cafe.jpg',cropTop:0,cropHeight:1,gallery:[],source:'https://polyhaven.com/a/comfy_cafe',license:'https://creativecommons.org/publicdomain/zero/1.0/',credit:'Poly Haven · CC0'};
test('panoramic environment is texture-projected and provides actual page destinations',()=>{
 const html=immersiveWorldMarkup({businessName:'Harbor Coffee',industry:'Coffee shop',pageTitle:'Home',theme:'coffee',environment,targets});
 assert.match(html,/texImage2D/);assert.match(html,/atan\(ray.x,-ray.z\)/);assert.match(html,/data-environment="panorama"/);
 assert.ok(!html.includes('buildWorldScene'));assert.ok(!html.includes('add(\'sphere\''));
 for(const target of targets)assert.ok(html.includes('href="'+target.slug+'.html"'));
});
test('exported environment rejects unsafe destinations and escapes names and script boundaries',()=>{
 const input={businessName:'Harbor </script><script>bad()</script>',industry:'Coffee shop',pageTitle:'Home',theme:'coffee',environment,targets};
 const html=immersiveWorldMarkup(input);
 assert.ok(!html.includes('</script><script>bad()'));assert.match(html,/Harbor &lt;\/script&gt;/);assert.ok(!html.includes('<script src='));
 for(const patch of [{environment:{...environment,url:'javascript:bad()'}},{environment:{...environment,cropHeight:0}},{targets:[]},{targets:[...targets,targets[0]]},{targets:[{slug:'../outside',title:'Outside'}]}])assert.throws(()=>immersiveWorldMarkup({...input,...patch}),/Invalid immersive world/);
});
test('uncommon niches retain a business-specific 3D content exhibition without unrelated photos',()=>{
 const html=immersiveWorldMarkup({businessName:'Meridian Horology',industry:'Clock restoration',pageTitle:'Home',intro:'Mechanical clock restoration and servicing',environment:{...environment,kind:'spatial-gallery',url:'',gallery:[]},targets});
 assert.match(html,/data-environment="content-exhibition"/);assert.match(html,/perspective:1200px/);
 assert.match(html,/Mechanical clock restoration and servicing/);assert.match(html,/Meridian Horology/);
 assert.ok(!html.includes('Poly Haven'));assert.ok(!html.includes('images.unsplash.com'));
 for(const target of targets)assert.ok(html.includes('href="'+target.slug+'.html"'));
});
