import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanSourceText,decodeSourceEntities} from '../src/lib/source-text';

test('extracted titles and headings render typographic punctuation instead of literal entities',()=>{
 assert.equal(cleanSourceText('<h1>How It Works &ndash; RESTORRE</h1>'),'How It Works – RESTORRE');
 assert.equal(cleanSourceText('Shop &mdash; Recovery Wraps &amp; More'),'Shop — Recovery Wraps & More');
 assert.equal(cleanSourceText('New&nbsp;Arrivals &hellip; Save &pound;20'),'New Arrivals … Save £20');
});
test('numeric Unicode character references and unknown references are handled safely',()=>{
 assert.equal(decodeSourceEntities('Launch &#8212; today &#x1F680;'),'Launch — today 🚀');
 assert.equal(decodeSourceEntities('Broken &#0; &#xD800; &madeup;'),'Broken &#0; &#xD800; &madeup;');
 assert.equal(decodeSourceEntities('Save &lt;10% &amp; read &quot;details&quot;'),'Save <10% & read "details"');
});
test('source text stripping, whitespace normalization and output bounds stay in place',()=>{
 assert.equal(cleanSourceText('<b>A &rsquo; B</b>  \n <em>C</em>',5),'A ’ B');
 assert.equal(cleanSourceText('<b>RESTORRE</b> \n recovery'),'RESTORRE recovery');
});
