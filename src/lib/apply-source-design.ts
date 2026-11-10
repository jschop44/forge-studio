import type {GeneratedPage} from './business-site';
import {escapeHtml as esc} from './export';
import {publicSourceAsset,type SourceImage,type WebsiteDesignDna} from './website-design-dna';
const generic=new Set(['the','and','our','your','with','from','this','that','for','about','services','service','products','product','menu','home','contact','photography','image','photo','website','business','offer','offering']);
function terms(value:string){return value.toLowerCase().replace(/<[^>]*>/g,' ').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(term=>term.length>2&&!generic.has(term)).map(term=>term.endsWith('s')&&term.length>4?term.slice(0,-1):term)}
function matchingImage(subject:string,images:SourceImage[],used:Set<string>){const wanted=terms(subject);if(!wanted.length)return;return images.filter(image=>!used.has(image.url)&&image.role!=='logo'&&image.alt.trim()).map(image=>({image,score:terms(image.alt).filter(term=>wanted.includes(term)).length})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score)[0]?.image}
function sourceImage(image:SourceImage,className='source-photo'){return '<img class="'+className+'" data-forge-source-image src="'+esc(image.url)+'" alt="'+esc(image.alt)+'" loading="lazy" decoding="async"'+(image.width?' width="'+image.width+'"':'')+(image.height?' height="'+image.height+'"':'')+'>'}
function foreground(background:string){const rgb=(background.length===4?background.slice(1).split('').map(c=>c+c).join(''):background.slice(1)).match(/../g)!.map(c=>parseInt(c,16));return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>150?'#151515':'#f8f8f8'}
/** Reuse observed assets and bounded design tokens without executing source HTML/CSS. */
export function applySourceDesign(pages:GeneratedPage[],dna:WebsiteDesignDna|undefined,mode:string):{pages:GeneratedPage[];warnings:string[]}{
 if(mode==='new'||!dna)return {pages,warnings:[]};
 const images=(dna.images||[]).slice(0,30).flatMap(image=>{const url=publicSourceAsset(image.url,dna.sourceUrl);return url?[{...image,url,alt:String(image.alt||'').slice(0,350),width:Number.isInteger(image.width)&&image.width!>0&&image.width!<=20000?image.width:undefined,height:Number.isInteger(image.height)&&image.height!>0&&image.height!<=20000?image.height:undefined}]:[]});
 const logo=images.find(image=>image.role==='logo');
 const emails=(dna.contact?.emails||[]).filter(email=>/^[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[a-z]{2,}$/i.test(email)).slice(0,3);
 const phones=(dna.contact?.phones||[]).filter(phone=>/^\+?[\d(). -]{7,30}$/.test(phone)).slice(0,3);
 const contact=[...emails.map(email=>'<a href="mailto:'+esc(email)+'">'+esc(email)+'</a>'),...phones.map(phone=>'<a href="tel:'+esc(phone.replace(/[(). -]/g,''))+'">'+esc(phone)+'</a>')].join(' · ');
 const palette=(dna.palette||[]).filter(color=>/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(color)).slice(0,12);
 const family=(dna.typography?.families||[]).find(value=>value.length<180&&/^[a-z0-9 ,.-]+$/i.test(value));
 const font=family?.split(',').map(part=>part.trim()).filter(Boolean).map(part=>/^(?:serif|sans-serif|monospace|system-ui|cursive|fantasy)$/i.test(part)?part:'"'+part+'"').join(',');
 const preserve=mode==='inspired'||mode==='preserve';
 const css='.source-brand-logo{display:inline-block;width:auto;max-width:min(160px,35vw);max-height:64px;object-fit:contain;vertical-align:middle;margin-right:14px}.source-contact{display:flex;gap:12px;flex-wrap:wrap;overflow-wrap:anywhere}.source-photo{display:block;width:100%;height:100%;object-fit:cover}.source-page-visual{margin:32px 0;max-width:100%;overflow:hidden;aspect-ratio:16/9}.source-page-visual img{width:100%;height:100%;object-fit:cover}'+(preserve?(font?'body,h1,h2,h3{font-family:'+font+'}':'')+(palette[0]?':root{--business-paper:'+palette[0]+';--business-ink:'+foreground(palette[0])+';--business-accent:'+foreground(palette[0])+'}body{background:'+palette[0]+';color:'+foreground(palette[0])+'}body>nav,body>footer,main p,.card p,.contact-panel{color:'+foreground(palette[0])+'}body>nav a,body>footer a,main a:not(.button),.eyebrow{color:inherit}main p,.card p,body>footer{opacity:1}.service-card,.contact-panel{background:transparent}.button{background:'+foreground(palette[0])+';color:'+palette[0]+'}':'')+(dna.layout?.header?'body>nav{display:flex;align-items:center;flex-wrap:wrap;gap:20px}':'')+(dna.layout?.heroAlignment==='center'?'.site-hero{grid-template-columns:1fr;text-align:center;justify-items:center}.site-hero>div{max-width:760px}.site-hero .editorial-photo{width:min(100%,980px)}':dna.layout?.heroAlignment==='right'?'.site-hero>div{text-align:right;justify-self:end}':'')+'@media(max-width:650px){.site-hero{grid-template-columns:1fr}}':'');
 let assigned=0;
 const output=pages.map(page=>{
  const used=new Set<string>();let html=page.html.replace(/<style id="forge-source-design">[\s\S]*?<\/style>/g,'');
  if(logo&&!/class=["'][^"']*source-brand-logo/.test(html)){
   if(/<span\b[^>]*class=["'][^"']*\bbrand-mark\b/i.test(html))html=html.replace(/<span\b[^>]*class=["'][^"']*\bbrand-mark\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i,()=>sourceImage(logo,'source-brand-logo'));
   else html=html.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/i,nav=>nav.replace(/(<a\b[^>]*>)/i,tag=>tag+sourceImage(logo,'source-brand-logo')));
  }
  // Specific offering sections require matching semantic evidence; never substitute a generic source photograph.
  html=html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/gi,article=>{const heading=article.match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i)?.[1]||'';const image=matchingImage(heading,images,used);if(!image)return article;used.add(image.url);assigned++;return /<img\b/i.test(article)?article.replace(/<img\b[^>]*>/i,()=>sourceImage(image,'service-photo')):article.replace(/(<article\b[^>]*>)/i,tag=>tag+sourceImage(image,'service-photo'))});
  let heroAssigned=false;
  html=html.replace(/<figure\b[^>]*class=["'][^"']*\beditorial-photo\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi,figure=>{
   const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';
   const subject=page.title+' '+heading+' '+(figure.match(/alt=["']([^"']*)["']/i)?.[1]||'');const image=matchingImage(subject,images,used);
   if(!image)return figure;used.add(image.url);heroAssigned=true;assigned++;return '<figure class="editorial-photo" data-forge-source-figure>'+sourceImage(image)+'</figure>';
  });
  if(!heroAssigned&&!/data-forge-source-figure/.test(html)){
   const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';
   const image=matchingImage(page.title+' '+heading,images,used);
   if(image&&!/data-forge-source-page-visual/.test(html)){assigned++;html=html.replace(/(<main\b[^>]*>)/i,tag=>tag+'<figure class="source-page-visual" data-forge-source-page-visual>'+sourceImage(image)+'</figure>')}
  }
  if(contact&&!/data-forge-source-contact/.test(html)){
   if(page.slug==='contact'&&/<p>Contact details are being updated\.<\/p>/i.test(html))html=html.replace(/<p>Contact details are being updated\.<\/p>/i,()=>'<p class="source-contact" data-forge-source-contact>'+contact+'</p>');
   else if(/<footer\b/i.test(html))html=html.replace(/(<footer\b[^>]*>)/i,tag=>tag+'<p class="source-contact" data-forge-source-contact>'+contact+'</p>');
   else html=html.replace(/<\/main>/i,()=>'<section aria-label="Contact"><p class="source-contact" data-forge-source-contact>'+contact+'</p></section></main>');
  }
  return {...page,html:html.replace(/<\/head>/i,'<style id="forge-source-design">'+css+'</style></head>')};
 });
 const warnings=['Original asset URLs were discovered in source HTML; availability and usage authorization still require verification.'];
 if(!assigned)warnings.push('No source images could be matched to generated sections; provide descriptive, authorized business imagery.');
 if(preserve)warnings.push('Source colors, available font names and representative images were reused. Exact layout, downloaded fonts and browser visual fidelity remain unverified.');
 return {pages:output,warnings};
}
