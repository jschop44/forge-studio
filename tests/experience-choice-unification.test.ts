import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const business=readFileSync(new URL('../src/app/business/page.tsx',import.meta.url),'utf8');
test('business generator offers a single 3D immersion choice with interactive objects',()=>{
 assert.match(business,/title:'3D immersion',description:'Business-matched immersive scenes and interactive 3D objects/);
 assert.doesNotMatch(business,/title:'Interactive 3D objects'/);
 assert.match(business,/experienceStyle==='object-navigation'\?'immersive':context.experienceStyle/);
 assert.match(business,/selectedExperience:WebsiteExperience=experienceStyle==='object-navigation'/);
});
