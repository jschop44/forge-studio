import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPublicText,publicSiteUrl} from '../src/lib/server/public-site-fetch.ts';
const options={timeout:2000,maxBytes:1000,accept:'text/html',redirects:2};
const publicHost=async()=>[{address:'93.184.216.34',family:4}];
test('Worker requests use native public Fetch without unsupported socket lookup overrides or forwarded credentials',async()=>{
 let calls=0;
 const result=await fetchPublicText(new URL('https://example.com'),options,{worker:true,resolveHost:publicHost,fetcher:async(url,init)=>{
  calls++;assert.equal(url.href,'https://example.com/');assert.equal(init.redirect,'manual');assert.equal(init.method,'GET');assert.ok(!('lookup' in init));assert.equal(new Headers(init.headers).get('authorization'),null);assert.equal(new Headers(init.headers).get('cookie'),null);
  return new Response('<h1>Example</h1>',{headers:{'content-type':'text/html'}});
 }});
 assert.equal(calls,1);assert.equal(result.body,'<h1>Example</h1>');
});
test('every redirect is separately validated and unsafe redirect destinations never receive a request',async()=>{
 const hosts=[];let calls=0;
 const result=await fetchPublicText(new URL('https://first.example'),options,{worker:true,resolveHost:async host=>{hosts.push(host);return publicHost()},fetcher:async()=>++calls===1?new Response(null,{status:302,headers:{location:'https://second.example/home'}}):new Response('OK',{headers:{'content-type':'text/html'}})});
 assert.deepEqual(hosts,['first.example','second.example']);assert.equal(result.url.href,'https://second.example/home');
 for(const location of ['http://second.example/','https://127.0.0.1/','https://user:password@second.example/']){
  let attempted=0;await assert.rejects(fetchPublicText(new URL('https://first.example'),options,{worker:true,resolveHost:publicHost,fetcher:async()=>{attempted++;return new Response(null,{status:302,headers:{location}})}}));assert.equal(attempted,1);
 }
});
test('private, mixed and absent DNS answers fail closed before any outbound Fetch',async()=>{
 for(const addresses of [[],[{address:'127.0.0.1',family:4}],[{address:'93.184.216.34',family:4},{address:'10.0.0.1',family:4}],[{address:'::ffff:127.0.0.1',family:6}]]){
  let requested=false;await assert.rejects(fetchPublicText(new URL('https://example.com'),options,{worker:true,resolveHost:async()=>addresses,fetcher:async()=>{requested=true;return new Response('bad')}}),/not public/);assert.equal(requested,false);
 }
});
test('oversized responses are cancelled and non-HTML or failed responses are rejected',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(1001))},cancel(){cancelled=true}});
 await assert.rejects(fetchPublicText(new URL('https://example.com'),options,{worker:true,resolveHost:publicHost,fetcher:async()=>new Response(stream,{headers:{'content-type':'text/html'}})}),/too large/);assert.equal(cancelled,true);
 await assert.rejects(fetchPublicText(new URL('https://example.com'),options,{worker:true,resolveHost:publicHost,fetcher:async()=>new Response('{}',{headers:{'content-type':'application/json'}})}),/did not return HTML/);
 await assert.rejects(fetchPublicText(new URL('https://example.com'),options,{worker:true,resolveHost:publicHost,fetcher:async()=>new Response(null,{status:403})}),/status 403/);
});
test('public extraction URL validation rejects credentials, private literals and non-HTTPS ports',()=>{
 for(const value of ['http://example.com','https://127.0.0.1','https://example.com:8443','https://user:secret@example.com','https://host.local'])assert.throws(()=>publicSiteUrl(value));
 assert.equal(publicSiteUrl('example.com').href,'https://example.com/');
});


test('a redirect authorization failure stops before fetching its destination',async()=>{
 const checked=[];let fetched=0;
 await assert.rejects(fetchPublicText(new URL('https://first.example'),{...options,beforeRequest:async url=>{checked.push(url.href);if(url.hostname==='second.example')throw Error('Destination policy disallows research')}},{worker:true,resolveHost:publicHost,fetcher:async()=>{fetched++;return new Response(null,{status:302,headers:{location:'https://second.example/private'}})}}),/policy disallows/);
 assert.equal(fetched,1);assert.deepEqual(checked,['https://first.example/','https://second.example/private']);
});

test('selective HTML retains content after megabytes of scripts and chunk-split delimiters',async()=>{
 const pieces=['<html><head><title>Pizza & wings</title><style>body{color:red}</style></head><body><scr','ipt type="application/json">',...Array(32).fill('x'.repeat(32768)),'</scr','ipt><!--','noise'.repeat(1000),'--','><h1>Pizza</h1><img src="/pizza.jpg"><a href="/menu">Menu</a></body></html>'];
 const stream=new ReadableStream({start(controller){for(const part of pieces)controller.enqueue(new TextEncoder().encode(part));controller.close()}});
 const result=await fetchPublicText(new URL('https://example.com'),{...options,maxBytes:400,selectiveHtml:true,maxDownloadBytes:2000000},{worker:true,resolveHost:publicHost,fetcher:async()=>new Response(stream,{headers:{'content-type':'text/html'}})});
 assert.match(result.body,/<title>Pizza & wings<\/title>/);assert.match(result.body,/<style>body\{color:red\}<\/style>/);assert.match(result.body,/<img src="\/pizza.jpg">/);assert.match(result.body,/href="\/menu"/);assert.doesNotMatch(result.body,/script|noise|xxx/);assert.equal(result.extraction.truncated,false);assert.equal(result.extraction.scriptsOmitted,1);assert.ok(result.extraction.downloadedBytes>1000000);
});

test('selective HTML cancels at the retained content limit and reports partial extraction',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('<h1>Business</h1>'+ 'content '.repeat(1000)))},cancel(){cancelled=true}});
 const result=await fetchPublicText(new URL('https://example.com'),{...options,maxBytes:100,selectiveHtml:true},{worker:true,resolveHost:publicHost,fetcher:async()=>new Response(stream,{headers:{'content-type':'text/html'}})});
 assert.equal(result.extraction.truncated,true);assert.ok(Buffer.byteLength(result.body)<=100);assert.match(result.body,/<h1>Business<\/h1>/);assert.equal(cancelled,true);
});

test('selective HTML bounds discarded script downloads and preserves UTF-8 between chunks',async()=>{
 const {PublicTextCollector}=await import('../src/lib/server/public-site-fetch.ts');
 const collector=new PublicTextCollector({maxBytes:100,selectiveHtml:true,maxDownloadBytes:1000});
 const encoded=new TextEncoder().encode('<h1>Café ☕</h1><script>'+ 'x'.repeat(2000));
 for(let i=0;i<encoded.length;i++)collector.push(encoded.subarray(i,i+1));
 const result=collector.finish();assert.equal(result.truncated,true);assert.equal(result.downloadedBytes,1000);assert.equal(result.body,'<h1>Café ☕</h1>');assert.equal(result.scriptsOmitted,1);
});
