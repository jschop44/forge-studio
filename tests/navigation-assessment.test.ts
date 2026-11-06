import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNavigationTargets} from '../src/lib/navigation-assessment';
test('classifies same-origin links, fragments, external and unsafe protocols',()=>{
 const result=assessNavigationTargets('https://example.com/',[
  {label:'About',target:'/about'},{label:'Jump',target:'#main'},
  {label:'Elsewhere',target:'https://other.example/path'},
  {label:'Bad',target:'javascript:alert(1)'},
  {label:'Empty',target:''},
 ]);
 assert.deepEqual(result.map(item=>item.status),['internal','fragment','external','unsafe','invalid']);
 assert.equal(result[0].path,'/about');
});
test('rejects credentialed or non-https capture sources',()=>{
 assert.throws(()=>assessNavigationTargets('http://example.com',[]));
 assert.throws(()=>assessNavigationTargets('https://user:pass@example.com',[]));
});
