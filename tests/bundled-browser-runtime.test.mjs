import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

// Match the keepNames transform used in the deployed Worker, then execute the
// emitted script in a separate realm without the module's bundler helpers.
test('production-bundled photographic controller runs in an isolated browser document',async()=>{
 const result=await build({entryPoints:['workers/immersive-world.mjs'],bundle:true,format:'cjs',platform:'node',write:false,minify:true,keepNames:true});
 const context={module:{exports:{}}};vm.runInNewContext(result.outputFiles[0].text,context);
 const html=context.module.exports.panoramaPhotoMarkup({url:'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/hospital_room_2.jpg',credit:'Test fixture',source:'https://polyhaven.com/a/hospital_room_2'},'Harbor Hospital','Hospital');
 const script=html.match(/<script id="forge-business-photo-controller">([\s\S]*?)<\/script>/)[1];
 assert.doesNotMatch(script,/__name/);
 const img={hidden:true},canvas={hidden:false,getContext:()=>null};
 const root={querySelector:selector=>selector==='canvas'?canvas:selector==='img'?img:{},hidden:true};
 assert.doesNotThrow(()=>vm.runInNewContext(script,{document:{getElementById:()=>root},matchMedia:()=>({matches:false})}));
 assert.equal(canvas.hidden,true);assert.equal(img.hidden,false);assert.equal(root.hidden,false);
});
