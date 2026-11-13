import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';
import {applySourceDesign} from '../src/lib/apply-source-design';

const origin='https://retail.example/';
const card=(href:string,url:string,title:string)=>'<a href="'+href+'"><img src="'+url+'" alt=""><span class="category-title">'+title+'</span></a>';
const site=(body:string)=>[{slug:'services',title:'Products',html:'<!doctype html><html><head></head><body><nav><a href="index.html">Retailer</a></nav><main>'+body+'</main></body></html>'}];

test('short published product-link titles label otherwise anonymous source photos',()=>{
 const dna=extractWebsiteDesignDna(
  card('/tv','/tv.jpg','TV &amp; Home Theater')+
  card('/computers','/computers.jpg','Computers &amp; Tablets')+
  card('/fruit','/fruit.jpg','Fruit Bowls'),origin);
 assert.deepEqual(dna.images.map(item=>item.alt),['TV & Home Theater','Computers & Tablets','Fruit Bowls']);
 const output=applySourceDesign(site(
  '<article class="service-card"><h2>TV &amp; Home Theater</h2></article>'+
  '<article class="service-card"><h2>Computers &amp; Tablets</h2></article>'),dna,'redesign').pages[0].html;
 assert.match(output,/src="https:\/\/retail\.example\/tv\.jpg"/);
 assert.match(output,/src="https:\/\/retail\.example\/computers\.jpg"/);
 assert.doesNotMatch(output,/src="https:\/\/retail\.example\/fruit\.jpg"/);
});

test('never borrow an unrelated label after the anchor closed or from an external vendor',()=>{
 const dna=extractWebsiteDesignDna(
  '<a href="/plain"><img src="/unlabeled.jpg" alt=""></a><span class="category-title">Headphones</span>'+
  card('https://outside.example/offer','/outbound.jpg','Wireless Headphones')+
  card('/cta','/cta.jpg','Shop now'),origin);
 const byUrl=Object.fromEntries(dna.images.map(item=>[new URL(item.url).pathname,item.alt]));
 assert.equal(byUrl['/unlabeled.jpg'],'');
 assert.equal(byUrl['/outbound.jpg'],'');
 assert.equal(byUrl['/cta.jpg'],'');
});

test('visible source label must be exclusive to one image in the bounded card',()=>{
 const dna=extractWebsiteDesignDna(
  '<a href="/two"><img src="/first.jpg" alt=""><img src="/second.jpg" alt=""><span class="category-title">Video Games</span></a>'+
  '<a href="/far"><img src="/far.jpg" alt="">'+('<span>Marketing copy and promotions.</span>'.repeat(30))+'<span class="category-title">Video Games</span></a>',origin);
 assert.equal(dna.images.find(item=>item.url.endsWith('/first.jpg'))?.alt,'');
 assert.equal(dna.images.find(item=>item.url.endsWith('/far.jpg'))?.alt,'');
});
