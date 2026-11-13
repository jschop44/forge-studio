import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRepresentativeSourcePages} from '../src/lib/source-navigation';

test('large retail navigation uses the four-page budget for distinct useful areas',()=>{
 const pages=[
  {label:'Deals',path:'/deals'}, {label:'Gift cards',path:'/gift-cards'},
  {label:'Computers',path:'/electronics/computers'}, {label:'Televisions',path:'/tvs'},
  {label:'Products',path:'/products'}, {label:'Installation Services',path:'/services'},
  {label:'About the company',path:'/about'}, {label:'Support',path:'/support'},
  {label:'Other',path:'/categories/misc'}
 ];
 assert.deepEqual(selectRepresentativeSourcePages(pages,4).map(p=>p.path),['/products','/services','/about','/support']);
 assert.equal(selectRepresentativeSourcePages(pages,12).length,9);
});
test('entertainment websites retain experiences, company and visitor information',()=>{
 const pages=[
  {label:'Explore',path:'/explore'},{label:'Movies',path:'/movies'},
  {label:'Theme parks',path:'/parks'}, {label:'Our company',path:'/company'},
  {label:'Contact',path:'/contact'},{label:'News',path:'/news'}
 ];
 const selected=selectRepresentativeSourcePages(pages,4).map(p=>p.path);
 assert.ok(selected.includes('/movies')||selected.includes('/parks'));
 assert.ok(selected.includes('/company'));
 assert.ok(selected.includes('/contact'));
});
test('small businesses and duplicate menu links remain bounded and deterministic',()=>{
 const pages=[{label:'Menu',path:'/menu'},{label:'About',path:'/about'},{label:'Contact',path:'/contact'},{label:'Menu',path:'/menu'}];
 assert.deepEqual(selectRepresentativeSourcePages(pages,4).map(p=>p.path),['/about','/contact','/menu']);
 assert.deepEqual(selectRepresentativeSourcePages(pages,0),[]);
 assert.deepEqual(selectRepresentativeSourcePages([{label:'Unsafe',path:'//external.example/a'},...pages],4).map(p=>p.path),['/about','/contact','/menu']);
});
