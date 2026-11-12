import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ensurePagePhotography} from '../src/lib/ensure-page-photography';
import type {GeneratedPage} from '../src/lib/business-site';

const page=(slug:string,body:string):GeneratedPage=>({
 slug,title:slug,html:'<!doctype html><html><body><main><h1>'+slug+'</h1>'+body+'</main></body></html>'
});
const src=(html:string)=>html.match(/data-forge-auto-photo="true"[^>]*><img src="([^"]+)"/)?.[1];

test('repairs the complete four-page site without duplicating niche photos',()=>{
 const pages=['index','services','about','contact'].map(slug=>page(slug,'<p>Content</p>'));
 const repaired=ensurePagePhotography(pages,'Coffee shop');
 const urls=repaired.map(item=>src(item.html));
 assert.ok(urls.every(Boolean));
 assert.equal(new Set(urls).size,4);
 assert.ok(urls.every(url=>url?.includes('images.unsplash.com/photo-')));
 assert.deepEqual(pages.map(p=>src(p.html)),[undefined,undefined,undefined,undefined]);
});

test('keeps the business logo while adding photography; preserves real source content photos',()=>{
 const logo='<img class="source-brand-logo" src="https://example.com/logo.png" alt="Brand logo">';
 const source='<img class="source-photo" src="https://example.com/products.jpg" alt="Coffee products">';
 const pages=[page('index',source),page('about',logo),page('contact','<p>Reach us</p>')];
 const [home,about,contact]=ensurePagePhotography(pages,'Coffee shop');
 assert.equal(src(home.html),undefined);
 assert.ok(about.html.includes(logo));
 assert.ok(src(about.html));
 assert.ok(src(contact.html));
 assert.notEqual(src(about.html),src(contact.html));
});

test('does not repeat an existing hero image on an empty secondary page',()=>{
 const photo='https://images.unsplash.com/photo-1645584396493-974e3c40fb05?auto=format&fit=crop&w=3840&q=90';
 const [home,about]=ensurePagePhotography([page('index','<img src="'+photo+'" alt="Coffee">'),page('about','')],'Coffee shop');
 assert.ok(home.html.includes(photo));
 assert.ok(src(about.html));
 assert.notEqual(src(about.html),photo);
});

test('only verified attribution-free external images are eligible',()=>{
 const base={url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/dental-1.jpg',title:'Dental practice treatment room',credit:'Photographer',source:'https://commons.wikimedia.org/wiki/File:Dental-1.jpg',license:'CC BY 4.0'};
 const cc0={...base,url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/dental-2.jpg',source:'https://commons.wikimedia.org/wiki/File:Dental-2.jpg',license:'CC0'};
 const [a,b]=ensurePagePhotography([page('index',''),page('about','')],'Dental practice',[base,cc0]);
 assert.equal(src(a.html),cc0.url);
 assert.equal(src(b.html),undefined);
 assert.ok(!a.html.includes(base.url));
});

test('unrecognized niches never receive unrelated stock photos',()=>{
 const pages=[page('index','<p>Specialist business</p>')];
 assert.deepEqual(ensurePagePhotography(pages,'Custom aerospace testing'),pages);
});

test('photo repair does not alter document structure or source style CSS',()=>{
 const input:GeneratedPage={slug:'about',title:'About',html:'<html><head><style>main{background:#224466}</style></head><body><main class="brand-preserved"><h1>About</h1></main><footer>Legal</footer></body></html>'};
 const [out]=ensurePagePhotography([input],'Baseball store');
 assert.ok(out.html.includes('<main class="brand-preserved">'));
 assert.ok(out.html.includes('<style>main{background:#224466}</style>'));
 assert.ok(out.html.indexOf('data-forge-auto-photo')<out.html.indexOf('</main>'));
 assert.ok(out.html.indexOf('</main>')<out.html.indexOf('<footer>'));
});
