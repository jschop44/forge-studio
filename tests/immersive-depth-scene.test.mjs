import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDepthScene} from '../workers/immersive-depth-scene.mjs';
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
