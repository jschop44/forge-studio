import test from 'node:test';
import assert from 'node:assert/strict';
import {editorDestination,editorImage,editorStylePatch} from '../src/lib/visual-editor-controls';
import {parseEditorSite,replaceEditorPage} from '../src/lib/visual-editor-site';
test('visual controls accept page, anchor, contact and public image destinations',()=>{
 for(const url of ['contact.html','#products','https://example.com/store','mailto:hello@example.com','tel:+15551234567'])assert.equal(editorDestination(url),url);
 assert.equal(editorImage('https://images.example.com/mug.jpg'),'https://images.example.com/mug.jpg');
 for(const url of ['javascript:alert(1)','java&#115;cript:alert(1)','data:text/html,bad','//example.com','https://user:pass@example.com/','a\\b','java\nscript:alert(1)'])assert.throws(()=>editorDestination(url));
 for(const url of ['javascript:alert(1)','http://example.com/a.jpg','https://127.0.0.1/a.jpg','https://localhost/a.jpg'])assert.throws(()=>editorImage(url));
});
test('styles are bounded typed values, never arbitrary CSS',()=>{
 assert.deepEqual(editorStylePatch({color:'#123456','font-family':'Times New Roman','font-size':'24',padding:'12',display:'grid','grid-template-columns':'2',gap:'18'}),{color:'#123456','font-family':'"Times New Roman"','font-size':'24px',padding:'12px',display:'grid','grid-template-columns':'repeat(2, minmax(0, 1fr))',gap:'18px'});
 for(const patch of [{color:'url(secret)'},{padding:'1;behavior:x'},{'font-size':'0'},{gap:'201'},{display:'contents'},{transform:'rotate(30deg)'},{'grid-template-columns':'7'}] as Record<string,string>[])assert.throws(()=>editorStylePatch(patch));
});
test('multi-page drafts replace only the selected page and reject ambiguous or oversized sites',()=>{
 const home={slug:'index',title:'Home',html:'<html><body><h1>Home</h1></body></html>'},contact={slug:'contact',title:'Contact',html:'<html><body><h1>Contact</h1></body></html>'};
 const pages=replaceEditorPage([home,contact],{...contact,html:'<html><body><h1>Updated contact</h1></body></html>'});
 assert.equal(pages[0],home);assert.match(pages[1].html,/Updated contact/);assert.equal(contact.html.includes('Updated'),false);
 for(const raw of ['{',JSON.stringify([home,home]),JSON.stringify([{...home,slug:'../bad'}]),JSON.stringify([{...home,html:'x'.repeat(2000001)}])])assert.deepEqual(parseEditorSite(raw),[]);
});
