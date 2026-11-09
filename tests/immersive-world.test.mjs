import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorldScene,immersiveWorldMarkup} from '../workers/immersive-world.mjs';
const targets=['index','services','about','contact'].map(slug=>({slug,title:slug,active:slug==='index'}));
test('procedural scenery contains bounded finite geometry and a selectable landmark for each page',()=>{
 for(const theme of ['coffee','dining','baseball','property','wellness','technology','gallery']){
  const scene=buildWorldScene(theme,targets);
  assert.ok(scene.length<60);
  for(const object of scene){assert.ok(object.center.every(Number.isFinite));assert.ok(object.size.every(n=>Number.isFinite(n)&&n>0));assert.ok(object.color.every(n=>n>=0&&n<=1))}
  assert.deepEqual(scene.filter(object=>object.target).map(object=>object.target),targets.map(t=>t.slug));
 }
 assert.notDeepEqual(buildWorldScene('coffee',targets),buildWorldScene('baseball',targets));
});
test('exported environment rejects unsafe destinations and escapes names and script boundaries',()=>{
 const input={businessName:'Harbor </script><script>bad()</script>',pageTitle:'Home',theme:'coffee',targets};
 const html=immersiveWorldMarkup(input);
 assert.ok(!html.includes('</script><script>bad()'));assert.match(html,/Harbor &lt;\/script&gt;/);assert.ok(!html.includes('<script src='));
 for(const patch of [{theme:'unknown'},{targets:[]},{targets:[...targets,targets[0]]},{targets:[{slug:'../outside',title:'Outside'}]},{targets:[{slug:'javascript:bad()',title:'Bad'}]}])assert.throws(()=>immersiveWorldMarkup({...input,...patch}),/Invalid immersive world/);
});
