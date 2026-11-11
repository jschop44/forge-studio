import assert from 'node:assert/strict';
import test from 'node:test';
import {auditGeneratedDraft} from '../src/lib/draft-quality-gate';

const page=(slug:string,body:string)=>({
 slug,title:slug,
 html:'<!doctype html><html><head><title>'+slug+'</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="main-content"><h1>'+slug+'</h1><p>Real content for an example business website.</p>'+body+'</main></body></html>'
});

test('extensionless and root-relative links resolve to real exported pages and fragments',()=>{
 const pages=[
  page('index','<a href="/services#offering">Shop</a><a href="./services.html?from=home#offering">Details</a><a href="/">Home</a><a href="?view=full#main-content">Same page</a>'),
  page('services','<section id="offering">Our offering</section><a href="/index.html#main-content">Home</a>')
 ];
 const result=auditGeneratedDraft(pages);
 assert.equal(result.readyForReview,true,result.errors.join('; '));
});

test('missing extensionless, root-relative and file links are errors, not silently accepted',()=>{
 const result=auditGeneratedDraft([
  page('index','<a href="/missing">Missing</a><a href="./unknown.html">Unknown</a><a href="../outside.html">Outside</a>'),
  page('services','<a href="/index.html">Home</a>')
 ]);
 assert.equal(result.readyForReview,false);
 assert.ok(result.errors.some(error=>error.includes('broken internal link to missing')));
 assert.ok(result.errors.some(error=>error.includes('broken internal link to unknown')));
 assert.ok(result.errors.some(error=>error.includes('unresolved internal link destination')));
});

test('unsafe protocols and misleading external URLs are not reviewable navigation',()=>{
 const dangerous=['javascript:void(0)','data:text/html,hello','blob:https://example.com/id','file:///etc/passwd','http://example.com','//example.com/path','https://user:secret@example.com'];
 const result=auditGeneratedDraft([page('index',dangerous.map(href=>'<a href="'+href+'">Open</a>').join(''))]);
 assert.equal(result.readyForReview,false);
 assert.equal(result.errors.length,dangerous.length,result.errors.join('; '));
});

test('HTTPS, email and phone destinations remain reviewable without claiming delivery verification',()=>{
 const result=auditGeneratedDraft([page('index','<a href="https://example.com/terms">Terms</a><a href="mailto:hello@example.com">Email</a><a href="tel:+15551234567">Call</a>')]);
 assert.equal(result.readyForReview,true,result.errors.join('; '));
 assert.equal(result.readyForPublishing,false);
});

test('non-page static assets explicitly require live checking',()=>{
 const result=auditGeneratedDraft([page('index','<a href="files/catalog.pdf">Download catalog</a>')]);
 assert.equal(result.readyForReview,true);
 assert.ok(result.warnings.some(w=>w.includes('requires live destination verification')));
});
