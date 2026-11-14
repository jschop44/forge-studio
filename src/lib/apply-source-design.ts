import {decodeSourceEntities} from './source-text';
import type {GeneratedPage} from './business-site';
import {escapeHtml as esc} from './export';
import {publicSourceAsset,type SourceImage,type WebsiteDesignDna} from './website-design-dna';
const generic=new Set(['the','and','our','your','with','from','this','that','for','about','services','service','products','product','menu','home','contact','photography','photograph','image','photo','picture','restaurant','food','website','business','offer','offering']);
function terms(value:string){return decodeSourceEntities(value.replace(/<[^>]*>/g,' ')).toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(term=>term.length>2&&!generic.has(term)).map(term=>term.endsWith('s')&&term.length>4?term.slice(0,-1):term)}
/** Only match source photos when their alt text actually describes the offering.
 * A partial lexical overlap (e.g. chicken salad for chicken wings, ceramic tile
 * for ceramic mugs) is not evidence that the photograph depicts the product.
 * Prefer no substitution over introducing an unrelated image.
 */
function matchingImage(subject:string,images:SourceImage[],used:Set<string>){
 const wanted=[...new Set(terms(subject))];
 if(!wanted.length)return;
 return images.filter(image=>!used.has(image.url)&&image.role!=='logo'&&image.alt.trim()).map(image=>{
  const observed=new Set(terms(image.alt));
  const overlap=wanted.filter(term=>observed.has(term)).length;
  return {image,overlap,full:overlap===wanted.length,extra:Math.max(0,observed.size-overlap)};
 }).filter(item=>item.full).sort((a,b)=>a.extra-b.extra)[0]?.image;
}
/** A general retail homepage can advertise several product categories without
 * repeating any single product's complete alt text in its H1. Only borrow a
 * source photograph when its distinctive advertised category occurs in the
 * actual homepage copy. Never consume photos reserved for specific products.
 */
/** Text-bearing marketing artwork is not suitable as a cropped editorial hero.
 * The source asset may still be retained as evidence, but clipping embedded
 * price/offer lettering makes a generated homepage unusable on narrow screens.
 */
function textHeavyRetailPromotion(image:SourceImage):boolean{
 const alt=decodeSourceEntities(image.alt||'');
 return /\b(?:save\s+(?:up to\s+)?\d{1,3}\s*%|\d{1,3}\s*%\s*off|terms(?: and conditions)? apply|members?\s+(?:get|save)\s+additional savings|limited[- ]time offer|(?:coupon|promo)\s+code)\b/i.test(alt);
}
function observedRetailHero(html:string,images:SourceImage[],used:Set<string>){
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
 const readable=decodeSourceEntities(main.replace(/<[^>]*>/g,' '));
 if(!/\b(?:retail|electronics|department store|online store)\b/i.test(readable))return;
 const publicTerms=new Set(terms(readable));
 return images.filter(image=>image.role==='content'&&!used.has(image.url)&&image.alt.trim().length>5&&!textHeavyRetailPromotion(image))
  .map(image=>{
   const words=[...new Set(terms(image.alt))];
   const categoryHits=words.filter(word=>word.length>=6&&publicTerms.has(word));
   return {image,categoryHits,extra:words.length-categoryHits.length};
  }).filter(x=>x.categoryHits.length>0)
  .sort((a,b)=>b.categoryHits.length-a.categoryHits.length||a.extra-b.extra)[0]?.image;
}
/** A broad editorial homepage should feature its own observed landscape art,
 * not a square branded merchandise tile that only shares the company name.
 * Prefer genuinely first-party, descriptive homepage images with wide geometry.
 * This is not evidence that an image depicts a specific topic card.
 */
function observedEditorialHomepageHero(dna:WebsiteDesignDna,images:SourceImage[],used:Set<string>){
 let homepage:URL;
 try{homepage=new URL(dna.sourceUrl)}catch{return}
 const normalizedPath=(path:string)=>path.replace(/\/+$/,'')||'/';
 return images.find(image=>{
  if(image.role!=='content'||used.has(image.url)||!image.width||!image.height)return false;
  if(image.width<1100||image.height<450||image.width/image.height<1.6||image.width/image.height>4.5)return false;
  const alt=decodeSourceEntities(image.alt||'').trim();
  if(alt.length<22||alt.length>200||textHeavyRetailPromotion(image)||
   /\b(?:limited edition|shop now|add to cart|buy now|clearance|coupon|sale ends)\b/i.test(alt))return false;
  try{
   const source=new URL(image.sourcePage);
   return source.origin===homepage.origin&&normalizedPath(source.pathname)===normalizedPath(homepage.pathname);
  }catch{return false}
 });
}
/** A promotional partner or bundle graphic is not the site's company logo.
 * Source crawls can see "Disney+ Hulu logo" inside a Disney hero promotion:
 * its image role is legitimate evidence, but not evidence of primary branding.
 * Do not replace a business wordmark with a co-branded campaign image.
 */
function promotionalPartnerLogo(image:SourceImage):boolean{
 if(image.role!=='logo')return false;
 const label=decodeSourceEntities(image.alt||'').trim();
 let path='';
 try{path=new URL(image.url).pathname}catch{}
 const multiBrand=/\+\s*(?!logo\b|icon\b|brand\b)[a-z][\w-]{1,}(?:\s+[a-z][\w-]{1,}){0,2}\s+(?:logo|icon|brand)\b/i.test(label);
 // A pipe often joins two distinct brand marks on a promotional banner,
 // e.g. "Fortnite | Disney logo" on Disney.com. Neither mark alone proves
 // that the combined promotional image is the site's primary identity.
 const partnerNames=label.split(/\s*\|\s*/).map(part=>part.trim()).filter(Boolean);
 const genericMark=/^(?:(?:official|site|website|home|brand)\s+)*(?:logo|icon|mark)$/i;
 const partnerPipe=partnerNames.length>=2&&partnerNames.every(part=>/[a-z0-9]{2,}/i.test(part)&&!genericMark.test(part));
 const campaignAsset=/\bbundle.{0,48}(?:banner|logo)\b/i.test(path.replace(/[_-]/g,' '));
 return multiBrand||partnerPipe||campaignAsset;
}
/** A retailer/entertainment site may publish many other brands' \"logos\".
 * Prefer a wordmark over treating an unrelated holiday, partner or product
 * campaign as the domain owner's primary company identity.
 * Require a recognizable domain brand only when the domain is brand-specific;
 * example/test hosts and generic site-builder domains remain unrestricted.
 */
function matchesPrimaryBrand(image:SourceImage,dna:WebsiteDesignDna):boolean{
 if(image.role!=='logo'||promotionalPartnerLogo(image))return false;
 const label=decodeSourceEntities(image.alt||'').trim();
 if(/^(?:source website (?:logo|icon)|official site (?:logo|icon))$/i.test(label))return true;
 let hostname='';
 try{hostname=new URL(dna.sourceUrl).hostname.toLowerCase().replace(/^www\./,'')}catch{return true}
 if(/\.(?:example|test|localhost)$/i.test(hostname))return true;
 const segments=hostname.split('.');
 let stem=(segments.at(-2)||'').replace(/[^a-z0-9]/g,'');
 if(['co','com','net','org'].includes(stem)&&segments.length>=3)stem=(segments.at(-3)||'').replace(/[^a-z0-9]/g,'');
 if(stem.length<5||/^(?:example|website|retail|shop|store|business|company|site|restaurant|market|hosting|pages|workers|onrender)$/.test(stem))return true;
 const siteName=decodeSourceEntities(dna.businessName||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 // When published source identity conflicts with the domain, avoid inferring
 // that domain text must occur in its legitimate logo.
 if(siteName&&!siteName.includes(stem))return true;
 const observed=label.toLowerCase().replace(/[^a-z0-9]/g,'');
 return observed.includes(stem);
}
function sourceImage(image:SourceImage,className='source-photo',eager=false){return '<img class="'+className+'" data-forge-source-image src="'+esc(image.url)+'" alt="'+esc(image.alt)+'" loading="'+(eager?'eager':'lazy')+'"'+(eager?' fetchpriority="high"':'')+' decoding="async"'+(image.width?' width="'+image.width+'"':'')+(image.height?' height="'+image.height+'"':'')+'>'}
function foreground(background:string){const rgb=(background.length===4?background.slice(1).split('').map(c=>c+c).join(''):background.slice(1)).match(/../g)!.map(c=>parseInt(c,16));return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>150?'#151515':'#f8f8f8'}
/** Reuse observed assets and bounded design tokens without executing source HTML/CSS. */
export function applySourceDesign(pages:GeneratedPage[],dna:WebsiteDesignDna|undefined,mode:string):{pages:GeneratedPage[];warnings:string[]}{
 if(mode==='new'||!dna)return {pages,warnings:[]};
 const images=(dna.images||[]).slice(0,30).flatMap(image=>{const url=publicSourceAsset(image.url,dna.sourceUrl);return url?[{...image,url,alt:String(image.alt||'').slice(0,350),width:Number.isInteger(image.width)&&image.width!>0&&image.width!<=20000?image.width:undefined,height:Number.isInteger(image.height)&&image.height!>0&&image.height!<=20000?image.height:undefined}]:[]});
 const rejectedCampaignLogos=images.filter(image=>image.role==='logo'&&!matchesPrimaryBrand(image,dna));
 const logo=images.find(image=>matchesPrimaryBrand(image,dna));
 const emails=(dna.contact?.emails||[]).filter(email=>/^[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[a-z]{2,}$/i.test(email)).slice(0,3);
 const phones=(dna.contact?.phones||[]).filter(phone=>/^\+?[\d(). -]{7,30}$/.test(phone)).slice(0,3);
 const contact=[...emails.map(email=>'<a href="mailto:'+esc(email)+'">'+esc(email)+'</a>'),...phones.map(phone=>'<a href="tel:'+esc(phone.replace(/[(). -]/g,''))+'">'+esc(phone)+'</a>')].join(' · ');
 const palette=(dna.palette||[]).filter(color=>/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(color)).slice(0,12);
 const family=(dna.typography?.families||[]).find(value=>value.length<180&&/^[a-z0-9 ,.-]+$/i.test(value));
 const font=family?.split(',').map(part=>part.trim()).filter(Boolean).map(part=>/^(?:serif|sans-serif|monospace|system-ui|cursive|fantasy)$/i.test(part)?part:'"'+part+'"').join(',');
 const safeFont=font?font+(/(?:^|,)(?:serif|sans-serif|monospace|system-ui|cursive|fantasy)$/.test(font)?'':',system-ui,sans-serif'):undefined;
 const preserve=mode==='inspired'||mode==='preserve';
 const css='.source-highlights{margin:clamp(28px,5vw,64px) 0}.source-highlights>h2{margin-bottom:18px}.source-highlights-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:clamp(12px,2vw,24px)}.source-highlights figure{min-width:0;margin:0}.source-highlights img{display:block;width:100%;height:clamp(210px,23vw,280px);max-height:280px;object-fit:cover;border-radius:16px}.source-highlights figcaption{padding:10px 2px;font-size:.88rem;line-height:1.45;overflow-wrap:anywhere}.source-brand-logo{display:inline-block;width:auto;max-width:min(160px,35vw);max-height:64px;object-fit:contain;vertical-align:middle;margin-right:14px}.source-contact{display:flex;gap:12px;flex-wrap:wrap;overflow-wrap:anywhere}.source-photo{display:block;width:100%;height:100%;object-fit:cover}.source-page-visual{margin:32px 0;max-width:100%;overflow:hidden;aspect-ratio:16/9}.source-page-visual img{width:100%;height:100%;object-fit:cover}'+(preserve?(safeFont?'body,h1,h2,h3{font-family:'+safeFont+'}':'')+(palette[0]?':root{--business-paper:'+palette[0]+';--business-ink:'+foreground(palette[0])+';--business-accent:'+foreground(palette[0])+'}body{background:'+palette[0]+';color:'+foreground(palette[0])+'}body>nav,body>footer,main p,.card p,.contact-panel{color:'+foreground(palette[0])+'}body>nav a,body>footer a,main a:not(.button),.eyebrow{color:inherit}main p,.card p,body>footer{opacity:1}.service-card,.contact-panel{background:transparent}.button{background:'+foreground(palette[0])+';color:'+palette[0]+'}':'')+(dna.layout?.header?'body>nav{display:flex;align-items:center;flex-wrap:wrap;gap:20px}':'')+(dna.layout?.heroAlignment==='center'?'.site-hero{grid-template-columns:1fr;text-align:center;justify-items:center}.site-hero>div{max-width:760px}.site-hero .editorial-photo{width:min(100%,980px)}':dna.layout?.heroAlignment==='right'?'.site-hero>div{text-align:right;justify-self:end}':'')+'@media(max-width:650px){.site-hero{grid-template-columns:1fr}}':'');
 let assigned=0;
 // Reserve each source photograph at most once across the entire generated site.
 // The brand logo is intentionally shared on every page, but unrelated content images
 // must not repeat in each page's hero or offering cards.
 const usedAcrossPages=new Set<string>();
 // Reserve source photos for the most-specific offering cards before assigning generic
 // page heroes. A homepage headline must not consume the only matching product image.
 const reservedForOfferings=new Set<string>();
 // The dedicated services/menu page owns its product imagery before homepage
 // teaser cards are allowed to claim assets with the same headings.
 const reservedForServices=new Set<string>();
 const servicePages=pages.filter(page=>page.slug==='services');
 for(const page of [...servicePages,...pages.filter(page=>page.slug!=='services')]){
  for(const article of page.html.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi)||[]){
   const heading=article.match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i)?.[1]||'';
   const selected=matchingImage(heading,images,reservedForOfferings);
   if(selected){reservedForOfferings.add(selected.url);if(page.slug==='services')reservedForServices.add(selected.url)}
  }
 }
 let suppressedUnverifiedMarks=0;
 const output=pages.map(page=>{
  const used=usedAcrossPages;let html=page.html.replace(/<style id="forge-source-design">[\s\S]*?<\/style>/g,'');
  if(logo&&!/class=["'][^"']*source-brand-logo/.test(html)){
   if(/<span\b[^>]*class=["'][^"']*\bbrand-mark\b/i.test(html))html=html.replace(/<span\b[^>]*class=["'][^"']*\bbrand-mark\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i,()=>sourceImage(logo,'source-brand-logo',true));
   else html=html.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/i,nav=>nav.replace(/(<a\b[^>]*>)/i,tag=>tag+sourceImage(logo,'source-brand-logo',true)));
  }else if(!logo){
   // If no official logo can be observed, retain the business-name wordmark,
   // not an invented single-letter icon that falsely resembles a copied mark.
   html=html.replace(/<span\b[^>]*class=["'][^"']*\bbrand-mark\b[^"']*["'][^>]*>\s*[a-z0-9]\s*<\/span>(?=\s*[^<]{2,}<\/a>)/i,()=>{suppressedUnverifiedMarks++;return ''});
  }
  // Specific offering sections require matching semantic evidence; never substitute a generic source photograph.
  html=html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/gi,article=>{const heading=article.match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i)?.[1]||'';const image=matchingImage(heading,images,page.slug==='services'?used:new Set([...used,...reservedForServices]));if(!image)return article;used.add(image.url);assigned++;return /<img\b/i.test(article)?article.replace(/<img\b[^>]*>/i,()=>sourceImage(image,'service-photo')):article.replace(/(<article\b[^>]*>)/i,tag=>tag+sourceImage(image,'service-photo'))});
  let heroAssigned=false;
  const heroSection=page.slug==='index'?html.match(/<section\b[^>]*class=["'][^"']*\bsite-hero\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i)?.[0]||'':'';
  const editorialHomepage=/(?:entertainment[\s,]+media|theme\s*parks?|streaming platform|film studio|television network)/i.test(heroSection);
  const editorialHomepageImage=editorialHomepage
   ?observedEditorialHomepageHero(dna,images,new Set([...used,...reservedForOfferings])):undefined;
  html=html.replace(/<figure\b[^>]*class=["'][^"']*\beditorial-photo\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi,figure=>{
   const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';
   const subject=page.title+' '+heading+' '+(figure.match(/alt=["']([^"']*)["']/i)?.[1]||'');
   // A company-name-only heading does not justify substituting a branded
   // merchandise photo for a theme park or entertainment homepage hero.
   const image=editorialHomepage?editorialHomepageImage:matchingImage(subject,images,new Set([...used,...reservedForOfferings]));
   if(!image||used.has(image.url))return figure;
   used.add(image.url);heroAssigned=true;assigned++;return '<figure class="editorial-photo" data-forge-source-figure>'+sourceImage(image,'source-photo',true)+'</figure>';
  });
  // The source editor often creates a genuinely text-only entertainment
  // homepage. Merely replacing existing <figure> tags cannot give that hero
  // its observed first-party artwork: insert a responsive editorial figure
  // *inside* the hero, never a detached image above <main>'s first section.
  if(!heroAssigned&&editorialHomepageImage&&heroSection&&!/<(?:figure|img|picture)\b/i.test(heroSection)){
   const image=editorialHomepageImage;
   const amended=heroSection.replace(/\btext-led\b/g,'image-led')
    .replace(/<\/section>$/i,'<figure class="editorial-photo" data-forge-source-figure>'+sourceImage(image,'source-photo',true)+'</figure></section>');
   if(amended!==heroSection){
    html=html.replace(heroSection,amended);
    used.add(image.url);assigned++;heroAssigned=true;
   }
  }
  // Retail homepages in both Preserve Style and Full Redesign should use
  // a genuine, semantically matched source photograph instead of a blank
  // hero when the generated hero has no picture. Product-specific photos
  // remain reserved for the catalog; text-heavy offer art is excluded.
  // Require depicted category wording in the actual homepage copy.
  if(!heroAssigned&&(preserve||mode==='redesign')&&page.slug==='index'){
   const firstHero=html.match(/<section\b[^>]*class=["'][^"']*\bsite-hero\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i)?.[0];
   if(firstHero&&!/<(?:figure|img)\b/i.test(firstHero)){
    const image=observedRetailHero(html,images,new Set([...used,...reservedForOfferings]));
    if(image){
     used.add(image.url);assigned++;heroAssigned=true;
     const amended=firstHero.replace(/\btext-led\b/g,'image-led').replace(/<\/section>$/i,'<figure class="editorial-photo" data-forge-source-figure>'+sourceImage(image,'source-photo',true)+'</figure></section>');
     html=html.replace(firstHero,amended);
    }
   }
  }
  if(!heroAssigned&&!/data-forge-source-figure/.test(html)){
   const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';
   const image=matchingImage(page.title+' '+heading,images,new Set([...used,...reservedForOfferings]));
   if(image&&!/data-forge-source-page-visual/.test(html)){used.add(image.url);assigned++;html=html.replace(/(<main\b[^>]*>)/i,tag=>tag+'<figure class="source-page-visual" data-forge-source-page-visual>'+sourceImage(image,'source-photo',true)+'</figure>')}
  }
  if(contact&&!/data-forge-source-contact/.test(html)){
   if(page.slug==='contact'&&/<p>Contact details are being updated\.<\/p>/i.test(html))html=html.replace(/<p>Contact details are being updated\.<\/p>/i,()=>'<p class="source-contact" data-forge-source-contact>'+contact+'</p>');
   else if(/<footer\b/i.test(html))html=html.replace(/(<footer\b[^>]*>)/i,tag=>tag+'<p class="source-contact" data-forge-source-contact>'+contact+'</p>');
   else html=html.replace(/<\/main>/i,()=>'<section aria-label="Contact"><p class="source-contact" data-forge-source-contact>'+contact+'</p></section></main>');
  }
  return {...page,html:html.replace(/<\/head>/i,'<style id="forge-source-design">'+css+'</style></head>')};
 });
 // The source may publish far more photographs than can be safely matched to
 // individual offerings. On a photo-poor homepage, show remaining observed
 // first-party highlights with their own published captions instead of
 // attaching arbitrary pictures to unrelated cards. This second pass runs
 // after all other pages so it cannot steal photos from services or About.
 const homeIndex=output.findIndex(page=>page.slug==='index');
 if(homeIndex>=0){
  const home=output[homeIndex];
  const cards=home.html.match(/<article\b[^>]*class=["'][^"']*\bservice-card\b[^"']*["'][^>]*>[\s\S]*?<\/article>/gi)||[];
  const illustrated=cards.filter(card=>/<img\b/i.test(card)).length;
  if(cards.length>=3&&illustrated<Math.ceil(cards.length/2)&&!home.html.includes('data-forge-source-highlights')){
   const rootOrigin=new URL(dna.sourceUrl).origin;
   const eligible=images.filter(image=>{
    if(image.role!=='content'||usedAcrossPages.has(image.url)||reservedForOfferings.has(image.url))return false;
    const label=decodeSourceEntities(image.alt).trim();
    if(label.length<12||label.length>160||/\b(?:logo|icon|sprite|pixel|tracking|placeholder)\b/i.test(label))return false;
    if(image.width&&image.width<220||image.height&&image.height<170)return false;
    try{return new URL(image.sourcePage).origin===rootOrigin}catch{return false}
   }).slice(0,3);
   if(eligible.length>=2){
    const figures=eligible.map(image=>'<figure>'+sourceImage(image,'source-highlights-photo')+'<figcaption>'+esc(decodeSourceEntities(image.alt).trim().slice(0,125))+'</figcaption></figure>').join('');
    const gallery='<section class="source-highlights" data-forge-source-highlights aria-label="More from this business"><h2>More to explore</h2><div class="source-highlights-grid">'+figures+'</div></section>';
    // Where the generated homepage has image-poor offering cards, introduce
    // the verified captioned source photographs *before* those text-only cards.
    // Keep every image in its own gallery so an unrelated campaign artwork is
    // never mislabeled as a particular offering or product.
    const sectionHeading=/<section\b[^>]*class=["'][^"']*\bsection-heading\b[^"']*["'][^>]*>/i;
    const decorated=sectionHeading.test(home.html)
     ?home.html.replace(sectionHeading,match=>gallery+match)
     :home.html.replace(/<\/main>/i,()=>gallery+'</main>');
    output[homeIndex]={...home,html:decorated};
    for(const image of eligible)usedAcrossPages.add(image.url);
    assigned+=eligible.length;
   }
  }
 }
 const warnings=['Original asset URLs were discovered in source HTML; availability and usage authorization still require verification.'];
 if(rejectedCampaignLogos.length)warnings.push('Co-branded, promotional or non-company source graphics were not treated as the primary company logo.');
 if(suppressedUnverifiedMarks)warnings.push('No official source logo could be observed; preserved the business-name wordmark without fabricating a logo.');
 if(!assigned)warnings.push('No source images could be matched to generated sections; provide descriptive, authorized business imagery.');
 if(preserve)warnings.push('Source colors, available font names and representative images were reused. Exact layout, downloaded fonts and browser visual fidelity remain unverified.');
 return {pages:output,warnings};
}
