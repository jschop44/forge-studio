import test from 'node:test';
import assert from 'node:assert/strict';
import {applySourceDesign} from '../src/lib/apply-source-design';
import {extractWebsiteDesignDna} from '../src/lib/website-design-dna';

const origin='https://example.com/';
const wrap=(content:string)=>'<html><head></head><body><nav><a href="index.html">Example business</a></nav><main>'+content+'</main></body></html>';
const cards=(withPhotos=false)=>['Planning','Scheduling','Support','Consulting'].map((title,index)=>
 '<article class="service-card"><h2>'+title+'</h2>'+(withPhotos?'<img class="service-photo" src="https://stock.example/card-'+index+'.jpg" alt="'+title+'">':'')+'</article>').join('');
const source=extractWebsiteDesignDna(
 '<img src="/logo.png" alt="Example logo">'+
 '<img src="/community.jpg" alt="Community volunteers working together" width="800" height="600">'+
 '<img src="/events.jpg" alt="Saturday neighborhood celebration at the center" width="800" height="600">'+
 '<img src="/team.jpg" alt="Friendly local staff portrait near the entrance" width="900" height="600">'+
 '<img src="/craft.jpg" alt="Handmade ceramic pottery on display" width="700" height="500">',
 origin);

test('low-photo extracted homepage gains distinct published gallery without stealing About imagery',()=>{
 const pages=[
  {slug:'index',title:'Home',html:wrap('<section><h1>Welcome</h1>'+cards()+'</section>')},
  {slug:'services',title:'Services',html:wrap('<h1>Services</h1>'+cards())},
  {slug:'about',title:'Community',html:wrap('<h1>Community</h1><figure class="editorial-photo"><img src="https://stock.example/old.jpg" alt="Community"></figure>')},
  {slug:'contact',title:'Contact',html:wrap('<h1>Get in touch</h1>')}
 ];
 const result=applySourceDesign(pages,source,'inspired');
 const home=result.pages[0].html;
 const about=result.pages[2].html;
 assert.match(about,/src="https:\/\/example.com\/community.jpg"/,'About keeps its matching source photo');
 assert.match(home,/data-forge-source-highlights/);
 assert.equal((home.match(/class="source-highlights-photo"/g)||[]).length,3);
 assert.match(home,/Saturday neighborhood celebration at the center/);
 assert.match(home,/Handmade ceramic pottery on display/);
 assert.doesNotMatch(home,/source-highlights-photo[^>]*community\.jpg/);
 assert.match(home,/source-highlights-grid/);
 const urls=result.pages.flatMap(page=>[...page.html.matchAll(/data-forge-source-image src="([^"]+)"/g)]
  .map(hit=>hit[1]).filter(url=>!url.endsWith('/logo.png')));
 assert.equal(new Set(urls).size,urls.length,'source content must remain unique across pages');
 assert.match(home,/href="index.html"/,'site navigation remains available');
});

test('photo-rich homepage never receives redundant source gallery',()=>{
 const pages=[{slug:'index',title:'Home',html:wrap('<h1>Welcome</h1>'+cards(true))}];
 const result=applySourceDesign(pages,source,'redesign');
 assert.doesNotMatch(result.pages[0].html,/data-forge-source-highlights/);
});

test('unknown, tracking, logo, tiny and non-descriptive source assets never pad an empty homepage',()=>{
 const filtered=extractWebsiteDesignDna(
  '<img src="/brand-logo.png" alt="Official brand logo">'+
  '<img src="/tiny.jpg" alt="Promotional photograph" width="25" height="25">'+
  '<img src="/blank.jpg" alt="">'+
  '<img src="/one.jpg" alt="A detailed authentic image of a museum display" width="900" height="600">',
  origin);
 const result=applySourceDesign([{slug:'index',title:'Home',html:wrap('<h1>Welcome</h1>'+cards())}],filtered,'inspired');
 assert.doesNotMatch(result.pages[0].html,/data-forge-source-highlights/);
});

test('source gallery never appears on a fresh site when source preservation was not requested',()=>{
 const page={slug:'index',title:'Home',html:wrap('<h1>Home</h1>'+cards())};
 assert.deepEqual(applySourceDesign([page],source,'new').pages,[page]);
});
