import test from 'node:test';
import assert from 'node:assert/strict';
import {connectExtractedPages} from '../src/lib/extracted-pages';
import {auditGeneratedDraft} from '../src/lib/draft-quality-gate';
const page=(slug:string,title=slug)=>({slug,title,html:'<!doctype html><html><head><title>'+title+'</title><meta name="viewport" content="width=device-width"></head><body><main><h1>'+title+'</h1><p>Actual inspected business page content is available here.</p></main></body></html>'});
test('exported homepage reaches every extra source page without builder controls',()=>{
 const extras=[page('black-friday','Shop now'),page('support','Help & support')];
 const result=connectExtractedPages([page('index'),...extras],extras);
 const seen=new Set<string>(),queue=['index'];
 while(queue.length){const slug=queue.shift()!;if(seen.has(slug))continue;seen.add(slug);const current=result.find(p=>p.slug===slug)!;for(const match of current.html.matchAll(/href="([a-z0-9-]+)\.html"/g))queue.push(match[1]);}
 assert.deepEqual([...seen].sort(),result.map(p=>p.slug).sort());
 assert.equal(auditGeneratedDraft(result).readyForReview,true);
 assert.match(result[0].html,/Help &amp; support/);
 assert.deepEqual(connectExtractedPages(result,extras),result);
 assert.deepEqual(connectExtractedPages([page('index')],[]),[page('index')]);
});
