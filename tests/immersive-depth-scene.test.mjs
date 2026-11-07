import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDepthScene,projectDepthScene} from '../workers/immersive-depth-scene.mjs';
const blueprint={version:1,pages:[{regions:[{type:'hero',bounds:{x:0,y:0,width:1000,height:300}},{type:'footer',bounds:{x:0,y:700,width:1000,height:120}},{type:'section',bounds:{x:0,y:0,width:-2,height:50}}]}]};
test('builds bounded noninteractive depth layers from measured regions',()=>{
 const scene=buildDepthScene(blueprint);
 assert.equal(scene.layers.length,2);
 assert.equal(scene.layers[0].depth,24);
 assert.equal(scene.layers[1].depth,2);
 assert.equal(scene.layers[0].interactive,false);
 assert.equal(scene.accessibility.reducedMotion,'disable-depth-animation');
 assert.equal(scene.publicationReady,false);
});
test('rejects invalid scene input and page selection',()=>{
 assert.throws(()=>buildDepthScene({version:2,pages:[]}));
 assert.throws(()=>buildDepthScene(blueprint,1));
});

test('projects measured layers into narrow viewport without horizontal overflow',()=>{
 const scene=buildDepthScene(blueprint);
 const projected=projectDepthScene(scene,375);
 assert.equal(projected.viewportWidth,375);
 assert.equal(projected.layers[0].width,375);
 assert.equal(projected.layers[1].x,0);
 assert.ok(projected.layers.every(layer=>layer.x+layer.width<=375));
});
test('respects reduced motion and rejects invalid viewport and settings',()=>{
 const scene=buildDepthScene(blueprint);
 const projected=projectDepthScene(scene,375,{reducedMotion:true});
 assert.equal(projected.animationEnabled,false);
 assert.equal(projected.camera.tiltDegrees,0);
 assert.ok(projected.layers.every(layer=>layer.depth===0));
 assert.throws(()=>projectDepthScene(scene,0));
 assert.throws(()=>projectDepthScene(scene,375,{maxTilt:30}));
});

test('rejects malformed or excessive depth layers before projection',()=>{
 const scene=buildDepthScene(blueprint);
 assert.throws(()=>projectDepthScene({...scene,layers:[{x:0,y:0,width:NaN,height:10,depth:4}]},375),/Invalid depth scene/);
 assert.throws(()=>projectDepthScene({...scene,layers:[{x:0,y:0,width:10,height:10,depth:-1}]},375),/Invalid depth scene/);
 assert.throws(()=>projectDepthScene({...scene,layers:Array.from({length:101},()=>scene.layers[0])},375),/Invalid depth scene/);
});

test('rejects excessive depth coordinates and invalid camera settings',()=>{
 const valid={version:1,layers:[{id:'a',role:'hero',x:0,y:0,width:200,height:100,depth:24}],camera:{perspective:1000,tiltDegrees:0}};
 assert.throws(()=>projectDepthScene({...valid,layers:[{...valid.layers[0],x:10001}]},500),/Invalid depth scene/);
 assert.throws(()=>projectDepthScene({...valid,camera:{perspective:Infinity,tiltDegrees:0}},500),/Invalid depth camera/);
 assert.throws(()=>projectDepthScene({...valid,camera:{perspective:1000,tiltDegrees:100}},500),/Invalid depth camera/);
});
