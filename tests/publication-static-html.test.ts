import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBusinessWebsite} from '../src/lib/business-site';
import {validateBusinessPublicationRequest} from '../src/lib/business-publication-request';
import {withoutPublicationJsonLd} from '../src/lib/publication-static-html';
const brief={businessName:'Acceptance Coffee',industry:'Coffee shop',description:'A neighborhood roastery offering coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs']};
const site=()=>generateBusinessWebsite({...brief,experienceStyle:'standard'});
const validate=(html:string)=>validateBusinessPublicationRequest({ownerApproved:true,businessName:brief.businessName,pages:[{slug:'index',title:'Home',html}]});
test('real standard generated pages can pass static publication with inert JSON-LD preserved',()=>{
 const pages=site().pages;
 const result=validateBusinessPublicationRequest({ownerApproved:true,businessName:brief.businessName,pages});
 assert.equal(result.valid,true,result.errors.join('; '));
 assert.deepEqual(result.pages,pages);
 assert.ok(result.pages!.every(page=>page.html.includes('<script type="application/ld+json">')));
});
test('JSON-LD lookalikes cannot authorize executable or external scripts',()=>{
 const original=site().pages[0].html;
 const variants=[
  '<script>alert(1)</script>',
  '<script type="application/ld+json" src="https://example.com/x.js">{}</script>',
  '<script type="application/ld+json" onload="alert(1)">{}</script>',
  '<script type="text/javascript" type="application/ld+json">{}</script>',
  '<script type="application/ld+json" type="text/javascript">{}</script>',
  '<script type="application/ld+json">alert(1)</script>',
  '<script type="application/ld+json">null</script>',
  '<script type="application/ld+json">"metadata"</script>',
  '<script type="application/ld+json">{"value":"</script><script>alert(1)</script>"}</script>',
  '<script type="application/ld+json">{}',
 ];
 for(const injection of variants){const html=original.replace('</body>',injection+'</body>');assert.equal(validate(html).valid,false,injection)}
});
test('metadata exceptions cannot hide raw-text or attribute-context markup escapes',()=>{
 const original=site().pages[0].html;
 for(const injection of [
  '<textarea><script type="application/ld+json">{"x":"</textarea><img src=x onerror=alert(1)>"}</script>',
  `<img title="<script type='application/ld+json'>{"x":" onerror=alert(1) "}</script>">`,
  '<script type="application/ld+json">{"x":"<iframe src=x></iframe>"}</script>',
 ])assert.equal(validate(original.replace('</body>',injection+'</body>')).valid,false);
 assert.equal(withoutPublicationJsonLd('<script type="application/ld+json">[]</script>'),'');
});
test('data-only exceptions never permit immersive runtimes or bypass approval',()=>{
 const pages=generateBusinessWebsite({...brief,experienceStyle:'immersive'}).pages;
 assert.equal(validateBusinessPublicationRequest({ownerApproved:true,businessName:brief.businessName,pages}).valid,false);
 assert.equal(validateBusinessPublicationRequest({ownerApproved:false,businessName:brief.businessName,pages:site().pages}).valid,false);
});
