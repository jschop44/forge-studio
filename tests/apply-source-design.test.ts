import test from 'node:test';
import assert from 'node:assert/strict';
import {applySourceDesign} from '../src/lib/apply-source-design';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';
const dna=extractWebsiteDesignDna('<header><img src="/logo.png" alt="Pizza logo"></header><img src="/wings.jpg" alt="Chicken wings"><img src="/pizza.jpg" alt="Pizza"><a href="mailto:info@example.com">Email</a><a href="tel:+15551234567">Call</a><style>body{background:#fff;font-family:Georgia,serif}</style>','https://example.com/');
const wrap=(body:string)=>'<!doctype html><html><head><title>Business</title></head><body><nav><a href="index.html"><span class="brand-mark">P</span>Pizza</a></nav><main>'+body+'</main><footer>Business</footer></body></html>';
test('source branding, semantically matched offering images and observed contact links reach every page',()=>{
 const pages=[{slug:'index',title:'Home',html:wrap('<section class="site-hero"><h1>Pizza</h1><figure class="editorial-photo"><img src="https://stock.example/a.jpg" alt="Restaurant photography"></figure></section>')},{slug:'services',title:'Menu',html:wrap('<article><h2>Chicken wings</h2><img src="https://stock.example/b.jpg"></article><article><h2>Pasta</h2></article>')},{slug:'contact',title:'Contact',html:wrap('<p>Contact details are being updated.</p>')}];
 const result=applySourceDesign(pages,dna,'redesign');for(const page of result.pages){assert.ok(page.html.includes('https://example.com/logo.png'));assert.ok(page.html.includes('mailto:info@example.com'));assert.ok(page.html.includes('tel:+15551234567'))}assert.ok(result.pages[1].html.includes('src="https://example.com/wings.jpg"'));assert.ok(!result.pages[1].html.includes('<h2>Pasta</h2><img'));assert.ok(!result.pages[2].html.includes('Contact details are being updated'));assert.ok(!result.pages[0].html.includes('body{background:#fff'));assert.ok(!pages[0].html.includes('source-brand-logo'));
});
test('preserve uses safe source design tokens and remains explicit about fidelity limits',()=>{
 const pages=[{slug:'index',title:'Home',html:wrap('<h1>Pizza</h1>')}];const result=applySourceDesign(pages,dna,'inspired');assert.ok(result.pages[0].html.includes('body{background:#fff'));assert.ok(result.pages[0].html.includes('font-family:"Georgia",serif'));assert.ok(result.pages[0].html.includes('data-forge-source-page-visual'));assert.ok(result.warnings.some(warning=>warning.includes('visual fidelity remain unverified')));assert.deepEqual(applySourceDesign(pages,dna,'new'),{pages,warnings:[]});
});
test('unsafe serialized evidence cannot inject executable styles, markup or private destinations',()=>{
 const unsafe={...dna,palette:['</style><script>bad()</script>'],typography:{families:['Arial;url(secret)']},images:[{url:'javascript:alert(1)',alt:'bad',role:'content' as const,sourcePage:dna.sourceUrl}],contact:{emails:['x@example.com"><script>bad()</script>'],phones:['javascript:alert(1)']}};
 const result=applySourceDesign([{slug:'index',title:'Home',html:wrap('<h1>Pizza</h1>')}],unsafe,'inspired');assert.ok(!result.pages[0].html.includes('<script>'));assert.ok(!result.pages[0].html.includes('javascript:'));assert.ok(!result.pages[0].html.includes('url(secret)'));assert.ok(result.warnings.some(warning=>warning.includes('No source images')));
});
test('summary pages receive source identity without a generated brand marker or footer',()=>{
 const pages=[{slug:'find-a-store',title:'Find a Store',html:'<html><head></head><body><nav><a href="index.html">Business</a></nav><main><h1>Find a Store</h1></main></body></html>'}];const once=applySourceDesign(pages,dna,'redesign'),twice=applySourceDesign(once.pages,dna,'redesign');assert.ok(once.pages[0].html.includes('source-brand-logo'));assert.ok(once.pages[0].html.includes('mailto:info@example.com'));assert.equal((twice.pages[0].html.match(/class="source-brand-logo"/g)||[]).length,1);assert.equal((twice.pages[0].html.match(/data-forge-source-contact/g)||[]).length,1);
});
