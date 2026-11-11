import test from 'node:test';
import assert from 'node:assert/strict';
import {contentWorldMarkup} from '../workers/content-world.mjs';

const config={
 businessName:'Meridian Horology',industry:'Clock restoration',
 intro:'Preservation and repair of historic timepieces.',
 palette:{night:'#12252a',paper:'#f3eee4',accent:'#b7a182'},
 targets:[{slug:'index',title:'Home',active:true},{slug:'services',title:'Services',description:'Clock restoration'},{slug:'about',title:'About'}]
};
test('guided spatial exhibition can walk toward a page without rotating text-bearing cards',()=>{
 const html=contentWorldMarkup(config);
 assert.match(html,/const maxDepth=180/);
 assert.match(html,/depth=Math\.max\(0,Math\.min\(maxDepth,depth\+amount\)\)/);
 assert.match(html,/translateZ\('\+\(i===index\?depth:/);
 assert.match(html,/event\.key\.toLowerCase\(\)==='w'/);
 assert.match(html,/event\.key\.toLowerCase\(\)==='s'/);
 assert.match(html,/stage\.dataset\.depthStep/,'depth is set in the runtime DOM, not pre-rendered as HTML');
 assert.doesNotMatch(html,/rotateY\(/,'3D depth must not skew textual labels');
 assert.match(html,/touch-action:none/);
 assert.match(html,/data-content-read/,'ordinary reading mode remains available');
 assert.match(html,/href="services\.html"/);
});
test('business-themed guided scene uses escaped labels rather than executable markup',()=>{
 const html=contentWorldMarkup({...config,businessName:'Meridian </script><script>bad()</script>'});
 assert.doesNotMatch(html,/<script>bad\(\)<\/script>/);
 assert.match(html,/Meridian &lt;\/script&gt;/);
});
