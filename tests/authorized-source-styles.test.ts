import test from 'node:test';
import assert from 'node:assert/strict';
import {appendAuthorizedStylesheets} from '../src/lib/authorized-source-styles';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';

const html='<!doctype html><html><head><title>Small Bakery</title></head><body><main><h1>Small Bakery</h1></main></body></html>';

test('authorized local CSS enriches saved HTML design evidence without network requests',()=>{
 const css='body { background-color: #f4ede3; font-family: Georgia, serif; } nav > a { color: #102030; }';
 const combined=appendAuthorizedStylesheets(html,[css]);
 assert.match(combined,/<style data-forge-authorized-css="true">/);
 assert.match(combined,/nav > a/);
 assert.ok(combined.indexOf('data-forge-authorized-css')<combined.indexOf('</head>'),'CSS remains in the inert reference head');
 assert.ok(!combined.includes('<script>'));
 const evidence=extractWebsiteDesignDna(combined,'https://bakery.example/');
 assert.ok(evidence.typography.families.some(family=>/Georgia/i.test(family)),'CSS typeface reaches source design extraction');
 assert.ok(evidence.palette.some(color=>color.toLowerCase()==='#f4ede3'),'CSS colors reach source design extraction');
});

test('more than one authorized CSS file can enrich the same source without changing original HTML',()=>{
 const result=appendAuthorizedStylesheets(html,['body{font-family:Arial,sans-serif}','h1{color:#102030}']);
 assert.equal((result.match(/data-forge-authorized-css="true"/g)||[]).length,2);
 assert.match(result,/<h1>Small Bakery<\/h1>/);
 assert.equal(html.includes('data-forge-authorized-css'),false);
 const withNoHead=appendAuthorizedStylesheets('<html><body><h1>Business</h1></body></html>',['body{color:#fff}']);
 assert.match(withNoHead,/<html><head><style data-forge-authorized-css/);
});

test('reject external source URLs, HTML breakouts, empty stylesheets, and oversized imports',()=>{
 assert.throws(()=>appendAuthorizedStylesheets('https://shop.example/',['body{}']),/saved HTML/);
 assert.throws(()=>appendAuthorizedStylesheets(html,[]),/one to three/);
 assert.throws(()=>appendAuthorizedStylesheets(html,Array(4).fill('body{}')),/one to three/);
 assert.throws(()=>appendAuthorizedStylesheets(html,['']),/bounded/);
 assert.throws(()=>appendAuthorizedStylesheets(html,['body{color:red}</style><script>alert(1)</script>']),/embedded HTML/);
 assert.throws(()=>appendAuthorizedStylesheets(html,['body{color:red}</STYLE \n><img src="/other">']),/embedded HTML/);
 assert.throws(()=>appendAuthorizedStylesheets(html,['a'.repeat(150001)]),/bounded/);
 assert.throws(()=>appendAuthorizedStylesheets(html+'x'.repeat(999990),['body{color:#fff}']),/saved HTML|exceeds/);
});
