import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDepthScene} from '../workers/immersive-depth-scene.mjs';
import {renderDepthSceneSvg} from '../workers/depth-scene-svg.mjs';
test('renders accessible script-free SVG with measured regions',()=>{
 const scene=buildDepthScene({version:1,pages:[{regions:[
  {type:'hero',bounds:{x:0,y:0,width:1000,height:300}},
  {type:'footer',bounds:{x:0,y:700,width:1000,height:120}}
 ]}]});
 const svg=renderDepthSceneSvg(scene,500,{reducedMotion:true});
 assert.match(svg,/<svg /);
 assert.match(svg,/role="img"/);
 assert.match(svg,/Observed website depth layout/);
 assert.match(svg,/width="500"/);
 assert.match(svg,/height="430"/);
 assert.equal((svg.match(/data-layer=/g)||[]).length,2);
 assert.doesNotMatch(svg,/<script|<foreignObject|onload=/i);
 assert.equal(svg,renderDepthSceneSvg(scene,500,{reducedMotion:true}));
});
test('rejects invalid depth preview viewport',()=>{
 const scene=buildDepthScene({version:1,pages:[{regions:[]}]});
 assert.throws(()=>renderDepthSceneSvg(scene,0),/Invalid viewport width/);
});
