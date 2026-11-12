import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverPexelsVisuals} from '../src/lib/server/business-visuals';
import {relevantVisualAssets} from '../src/lib/visual-assets';
test('Pexels search retains niche evidence and credits, rejecting unrelated, duplicate and undersized photos',async()=>{
 const original=process.env.PEXELS_API_KEY;process.env.PEXELS_API_KEY='test-secret';
 try{
  const photo={width:3840,height:2160,alt:'Baseball on the field',photographer:'Jane',url:'https://www.pexels.com/photo/baseball-123/',src:{large2x:'https://images.pexels.com/photos/123/baseball.jpeg'}};
  const assets=await discoverPexelsVisuals('Baseball',async(input,init)=>{assert.equal(new URL(String(input)).hostname,'api.pexels.com');assert.equal((init?.headers as Record<string,string>).Authorization,'test-secret');return new Response(JSON.stringify({photos:[photo,photo,{...photo,alt:'Coffee mug'},{...photo,width:800}]}))});
  assert.equal(assets.length,1);assert.equal(assets[0].credit,'Jane on Pexels');assert.equal(assets[0].license,'Pexels License');
  assert.equal(relevantVisualAssets('Baseball',[{...assets[0],url:'https://upload.wikimedia.org/wikipedia/commons/test.jpg'}]).length,0);
  assert.deepEqual(await discoverPexelsVisuals('Baseball',async()=>new Response('',{status:429})),[]);
 }finally{if(original===undefined)delete process.env.PEXELS_API_KEY;else process.env.PEXELS_API_KEY=original}
});
