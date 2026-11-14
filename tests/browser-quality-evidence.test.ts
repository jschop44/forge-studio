import test from 'node:test';
import assert from 'node:assert/strict';
import {collectBrowserQualityEvidence} from '../src/lib/browser-quality-evidence';

test('browser quality evidence distinguishes pending lazy photos from completed broken images',()=>{
 const images=[
  {complete:false,naturalWidth:0,loading:'lazy',currentSrc:'https://example.test/lazy.jpg',src:'https://example.test/lazy.jpg',hasAttribute:()=>true},
  {complete:false,naturalWidth:0,loading:'eager',currentSrc:'https://example.test/slow.jpg',src:'https://example.test/slow.jpg',hasAttribute:()=>true},
  {complete:true,naturalWidth:0,loading:'lazy',currentSrc:'https://example.test/broken.jpg',src:'https://example.test/broken.jpg',hasAttribute:()=>true},
  {complete:true,naturalWidth:160,loading:'lazy',currentSrc:'https://example.test/loaded.jpg',src:'https://example.test/loaded.jpg',hasAttribute:()=>true}
 ];
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{
  querySelectorAll:(selector:string)=>selector==='img'?images:[],
  documentElement:{scrollWidth:390}
 }});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{innerWidth:390}});
 try{
  const result=collectBrowserQualityEvidence();
  assert.deepEqual(result.brokenImages,['https://example.test/broken.jpg']);
  assert.equal(result.images,4);
  assert.equal(result.overflowPx,0);
  assert.equal(result.imageAltMissing,0);
 }finally{
  if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);
  else Reflect.deleteProperty(globalThis,'document');
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);
  else Reflect.deleteProperty(globalThis,'window');
 }
});
