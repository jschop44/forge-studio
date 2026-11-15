import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('authorized browser capture records Preserve Style geometry on home and representative pages',()=>{
 const source=readFileSync(new URL('../workers/browser-capture.mjs',import.meta.url),'utf8');
 const fields=['headerPaddingTop','headerPaddingBottom','heroGap','heroPaddingTop','heroPaddingBottom','heroMediaRadius'];
 for(const field of fields){
  const count=source.split(field+':boundedPx(').length-1;
  assert.equal(count,2,field+' must be computed for both the homepage and its representative pages');
 }
 assert.equal(source.split('...rhythm').length-1,2,'all captured tokens must reach serialized page evidence');
 assert.equal(source.split('const boundedPx=').length-1,2,'capture paths must enforce the same source measurement limits');
 assert.ok(source.includes("const heroMedia=hero?.querySelector('img,video,picture img')"));
});
