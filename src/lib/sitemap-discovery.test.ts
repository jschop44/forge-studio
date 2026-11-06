import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {sitemapPages} from './sitemap-discovery';
test('extracts same-origin page paths without duplicates',()=>{const xml='<urlset><url><loc>https://example.com/about-us</loc></url><url><loc>https://example.com/about-us</loc></url><url><loc>https://other.com/contact</loc></url><url><loc>https://example.com/services</loc></url></urlset>';assert.deepEqual(sitemapPages(xml,'https://example.com'),[{label:'about us',path:'/about-us'},{label:'services',path:'/services'}])});
test('rejects oversized input and non-content resources',()=>{assert.equal(sitemapPages('x'.repeat(250001),'https://example.com').length,0);assert.equal(sitemapPages('<loc>https://example.com/sitemap.xml</loc><loc>https://example.com/privacy</loc>','https://example.com').length,0)});
