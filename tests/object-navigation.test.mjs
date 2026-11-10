import test from 'node:test';
import assert from 'node:assert/strict';
import {objectNavigationMarkup} from '../workers/object-navigation.mjs';
test('exported object scene is self-contained and escapes untrusted offering text',()=>{
 const html=objectNavigationMarkup({theme:'coffee',targets:[{part:'coffee',label:'Beans </script><script>bad()</script>',href:'services.html#offering-0'}]});
 assert.ok(html.includes('getContext(\'webgl\''));assert.ok(html.includes('data-object-part="coffee"'));
 assert.ok(html.includes('Beans &lt;/script&gt;'));assert.ok(!html.includes('</script><script>bad'));
 assert.ok(!html.includes('<script src='));
});
test('invalid destinations, unrelated mesh parts and empty navigation cannot enter exported scripts',()=>{
 for(const plan of [{theme:'coffee',targets:[]},{theme:'coffee',targets:[{part:'bat',label:'Bats',href:'services.html#offering-0'}]},{theme:'coffee',targets:[{part:'coffee',label:'Beans',href:'javascript:bad()'}]},{theme:'baseball',targets:[{part:'ball',label:'Ball',href:'https://other.test'}]}])assert.throws(()=>objectNavigationMarkup(plan),/Invalid object navigation/);
});

test('collection rotation applies to imagery while offering labels remain flat',()=>{
 const html=objectNavigationMarkup({theme:'collection',industry:'Decor',targets:[{part:'offering-0',label:'Furniture',href:'services.html#offering-0'}]});
 assert.match(html,/\.collection-object\{transform:none\}/);
 assert.match(html,/\.collection-object img\{[^}]*transform:perspective/);
 assert.doesNotMatch(html,/\[data-collection-stage\]\{[^}]*transform:/);
});
