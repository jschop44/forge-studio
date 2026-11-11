import test from 'node:test';
import assert from 'node:assert/strict';
import {inferBusinessBrief,normalizeBusinessBrief} from '../src/lib/business-brief';
import {generateBusinessWebsite} from '../src/lib/business-site';
test('the exact inline example shown by the UI keeps industry and offerings separate',()=>{
 const parsed=inferBusinessBrief('Harbor Club','Industry: Soccer club; Offerings: Training, Teamwear, Match tickets.');
 assert.equal(parsed.industry,'Soccer club');
 assert.deepEqual(parsed.services,['Training','Teamwear','Match tickets.']);
 const site=generateBusinessWebsite(parsed);
 assert.ok(site.pages.find(page=>page.slug==='services')?.html.includes('Teamwear'));
 assert.ok(!parsed.industry.includes('Offerings:'));
});
test('inline and multiline coffee briefs produce the same facts and preserve description',()=>{
 const inline='Industry: Coffee shop; Offerings: Roasted coffee beans, Espresso drinks\nA neighborhood coffee shop serving its local community.';
 const parsed=inferBusinessBrief('Harbor Coffee',inline);
 assert.deepEqual(parsed,inferBusinessBrief('Harbor Coffee',inline.replace('; ','\n')));
 assert.equal(parsed.industry,'Coffee shop');
 assert.deepEqual(parsed.services,['Roasted coffee beans','Espresso drinks']);
 assert.equal(parsed.description,'A neighborhood coffee shop serving its local community.');
});
test('field normalization preserves ordinary prose and semicolon-separated service lists',()=>{
 const prose='We restore clocks; our team repairs mechanical movements.';
 assert.equal(normalizeBusinessBrief(prose),prose);
 const text='Business type: Horology workshop; PRODUCTS: Clock restoration; Watch repair';
 assert.equal(normalizeBusinessBrief(text),'Business type: Horology workshop\nPRODUCTS: Clock restoration; Watch repair');
 const parsed=inferBusinessBrief('Clock Workshop',text);
 assert.equal(parsed.industry,'Horology workshop');assert.deepEqual(parsed.services,['Clock restoration','Watch repair']);
 assert.equal(normalizeBusinessBrief(normalizeBusinessBrief(text)),normalizeBusinessBrief(text));
});
