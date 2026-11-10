import test from 'node:test';
import assert from 'node:assert/strict';
import {publicResearchPolicy} from '../src/lib/server/public-site-policy';
import {PublicSiteHttpError} from '../src/lib/server/public-site-fetch';
test('extraction policies honor path exclusions and cache policy per origin',async()=>{
 let requests=0;
 const allow=publicResearchPolicy(async url=>{requests++;assert.equal(url.pathname,'/robots.txt');return {url,body:'User-agent: *\nDisallow: /private'}});
 await allow(new URL('https://example.com/menu'));await allow(new URL('https://example.com/about'));
 await assert.rejects(allow(new URL('https://example.com/private/prices')),/disallows automated extraction/);
 assert.equal(requests,1);await allow(new URL('https://other.example/menu'));assert.equal(requests,2);
});
test('missing robots permits public extraction, unavailable policy fails closed',async()=>{
 const missing=publicResearchPolicy(async()=>{throw new PublicSiteHttpError(404)});await missing(new URL('https://example.com/menu'));
 for(const failure of [new PublicSiteHttpError(403),new PublicSiteHttpError(503),Error('timeout')]){
  await assert.rejects(publicResearchPolicy(async()=>{throw failure})(new URL('https://example.com/menu')),/policy could not be verified/);
 }
 await assert.rejects(publicResearchPolicy(async url=>({url,body:'<html>Access denied</html>'}))(new URL('https://example.com')),/policy could not be verified/);
});
test('excessive crawl delay requires authorized source instead of ignoring policy',async()=>{
 await assert.rejects(publicResearchPolicy(async url=>({url,body:'User-agent: *\nCrawl-delay: 20'}))(new URL('https://example.com/menu')),/crawl delay exceeds/);
});
