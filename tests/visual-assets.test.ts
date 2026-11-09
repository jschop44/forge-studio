import test from 'node:test';
import assert from 'node:assert/strict';
import {relevantVisualAssets} from '../src/lib/visual-assets';
import {discoverBusinessVisuals} from '../src/lib/server/business-visuals';
import {businessArtDirection} from '../src/lib/business-art-direction';
import {businessEnvironment} from '../src/lib/business-environments';
import {industryPhotos,photoLibrary,servicePhoto} from '../src/lib/industry-photos';
const asset=(title:string)=>({url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/'+title.replace(/ /g,'_')+'.jpg',title,credit:'Example photographer',source:'https://commons.wikimedia.org/wiki/File:Example.jpg',license:'CC BY 4.0'});
test('subject evidence and reusable licenses are required before niche imagery is selected',()=>{
 const valid=asset('Dental practice treatment room');
 assert.deepEqual(relevantVisualAssets('Dental practice',[asset('Office meeting room'),asset('Yoga studio'),valid,{...valid,license:'All rights reserved'},{...valid,license:'CC BY-NC 4.0'},{...valid,url:'https://unverified.example/dental.jpg'}]),[valid]);
 assert.deepEqual(relevantVisualAssets('Professional services',[asset('Office meeting room')]),[]);
 assert.deepEqual(industryPhotos('Dental practice'),[]);assert.deepEqual(industryPhotos('Unknown business'),[]);
 assert.notDeepEqual(industryPhotos('Hair salon'),industryPhotos('Yoga and wellness'));
});
test('baseball, soccer, medical and legal identities remain distinct across visuals and color systems',()=>{
 assert.notDeepEqual(industryPhotos('Baseball store'),industryPhotos('Soccer club'));
 assert.equal(businessEnvironment('Baseball store').url.includes('Meiji_Jingu_Stadium'),true);
 assert.equal(businessEnvironment('Soccer club').url.includes('stadium_01'),true);
 assert.equal(businessEnvironment('Coffee shop').url.includes('comfy_cafe'),true);
 for(const [left,right] of [['Coffee shop','Baseball store'],['Healthcare','Hair salon'],['Legal services','Fitness']])assert.notDeepEqual(businessArtDirection(left,'Same Brand'),businessArtDirection(right,'Same Brand'));
});
test('free discovery discards unrelated file results and retains attribution evidence',async()=>{
 let calls=0;
 const result=await discoverBusinessVisuals('Dental photography',async input=>{calls++;const url=new URL(String(input));assert.equal(url.hostname,'commons.wikimedia.org');assert.equal(url.searchParams.get('gsrlimit'),'10');assert.equal(url.searchParams.get('iiurlwidth'),'3840');return new Response(JSON.stringify({query:{pages:{1:{title:'File:Dental treatment room.jpg',imageinfo:[{mime:'image/jpeg',width:4800,height:3200,thumburl:'https://upload.wikimedia.org/wikipedia/commons/a/a1/dental.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Dental_treatment_room.jpg',extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'<a>Jane Photographer</a>'}}}]},2:{title:'File:Office lobby.jpg',imageinfo:[{mime:'image/jpeg',width:4800,height:3200,thumburl:'https://upload.wikimedia.org/wikipedia/commons/b/b2/office.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Office.jpg',extmetadata:{LicenseShortName:{value:'CC0'}}}]}}}}))});
 assert.equal(calls,1);assert.equal(result.length,1);assert.equal(result[0].credit,'Jane Photographer');assert.equal(result[0].license,'CC BY-SA 4.0');
});

test('specialized niches never borrow broad stock imagery',()=>{for(const niche of ['Construction','Jewelry','Spa','Motorcycle','Auto repair','Software','Sushi restaurant','Vegan restaurant'])assert.deepEqual(industryPhotos(niche),[],niche);assert.equal(servicePhoto('Software development','Software'),null);assert.equal(servicePhoto('Gym training','Fitness'),null);assert.ok(!photoLibrary.entertainment.includes('photo-1500534623283-312aade485b7' as never))});
