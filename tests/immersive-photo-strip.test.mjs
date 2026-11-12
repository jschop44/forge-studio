import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {immersiveWorldMarkup} from '../workers/immersive-world.mjs';

const photos=Array.from({length:5},(_,index)=>'https://images.unsplash.com/photo-test-'+index+'?w=2000');
function world(kind='spatial-gallery'){
 return immersiveWorldMarkup({
  environment:{kind,url:photos[0],gallery:photos,cropTop:0,cropHeight:1,source:'https://unsplash.com/license',credit:'Curated',license:'Unsplash License'},
  palette:{night:'#18261d',paper:'#faf7e9',accent:'#90a962',font:'Georgia'},
  businessName:'Fruit stand fresh',industry:'Fresh produce retail',pageTitle:'Home',sceneTitle:'Fruit stand fresh',
  targets:[{slug:'index',title:'Home',active:true},{slug:'services',title:'Products',active:false},{slug:'about',title:'About',active:false},{slug:'contact',title:'Contact',active:false}]
 });
}
test('immersive fruit stand shows four selectable photo thumbnails on the front of the scene',()=>{
 const html=world();
 assert.equal((html.match(/data-world-gallery-image="\d+"/g)||[]).length,4);
 assert.equal((html.match(/class="world-gallery-strip"/g)||[]).length,1);
 assert.match(html,/aria-label="Browse Fresh produce retail photographs"/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/@media\(max-width:700px\)[^']*world-gallery-strip/);
 assert.match(html,/world-gallery-strip button/);
 assert.match(html,/function selectGalleryView\(index\)/);
 assert.match(html,/selectGalleryView\(\(galleryIndex\+1\)%scene.gallery.length\)/);
 for(const [tag,source] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new Script(source),tag);
});
test('panorama scene does not offer thumbnails that would distort non-panoramic photos',()=>{
 const html=world('panorama');
 assert.equal((html.match(/data-world-gallery-image="\d+"/g)||[]).length,0);
 assert.match(html,/data-environment="panorama"/);
});
test('immersive photo strip is capped at four assets to avoid covering page controls',()=>{
 const html=world();
 assert.equal((html.match(/data-world-gallery-image/g)||[]).length,5); // four buttons + runtime selector
 assert.ok(!html.includes('photo-test-4'));
});
