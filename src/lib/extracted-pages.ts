import {usefulSourcePage} from './source-reuse-policy';
import {defaultSourcePages} from './default-source-content';
import {publicSourceAsset} from './website-design-dna';
import {offeringPhotoCandidates,selectDiversePhoto} from './industry-photos';
import {businessArtDirection} from './business-art-direction';
import {relevantVisualAssets,type VisualAsset} from './visual-assets';
import {objectNavigationMarkup} from '../../workers/object-navigation.mjs';
import {enhanceCinematicPages,objectNavigationPlan,type WebsiteExperience} from './website-experience';
import {escapeHtml as esc} from './export';
import type {GeneratedPage} from './business-site';
import type {SiteEvidence} from './forge-intelligence';

/** Allocate filenames once so navigation uses exactly the pages that will be emitted. */
function extractedPageEntries(evidence:SiteEvidence){
 const used=new Set(['index','services','about','contact']);
 const paths=new Set<string>();
 const entries=(evidence.pageSummaries||[]).flatMap(page=>{
  if(!usefulSourcePage(page))return [];
  let path:string;
  try{const url=new URL(page.path,evidence.url);if(url.origin!==new URL(evidence.url).origin)return [];path=url.pathname.replace(/\/+$/,'')||'/'}catch{return []}
  if(paths.has(path))return [];paths.add(path);
  const base=path.split('/').filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,40);
  if(!base||['index','services','about','contact'].includes(base))return [];
  let slug=base;let suffix=2;while(used.has(slug))slug=base+'-'+suffix++;
  used.add(slug);return [{page,slug}];
 });
 return entries;
}
/** Keep source identity separate from exported/published page schemas. */
export function extractedPageSources(evidence:SiteEvidence|null|undefined):Record<string,string>{
 return evidence?Object.fromEntries([...extractedPageEntries(evidence).map(({page,slug})=>[slug,new URL(page.path,evidence.url).href]),...defaultSourcePages(evidence).map(({slug,source})=>[slug,source])]):{};
}
export function createExtractedPages(evidence:SiteEvidence,businessName:string):GeneratedPage[]{
 const entries=extractedPageEntries(evidence);
 return entries.map(({page,slug})=>{
  const title=esc(page.title||page.label);const summary=esc(page.description||'');
  const navigation=entries.filter(item=>item.slug!==slug).map(item=>'<a href="'+item.slug+'.html">'+esc(item.page.label)+'</a>').join('');
  const headings=[...new Set(page.headings.map(heading=>heading.trim()).filter(Boolean))].filter(heading=>heading!==page.title&&heading!==page.label).slice(0,12);
  const source=new URL(page.path,evidence.url).href;
  const paragraphs=[...new Set((page.paragraphs||[]).map(value=>value.trim()).filter(value=>value&&value!==page.description))].slice(0,24);
  const seenAssets=new Set<string>();
  const sourceImages=(page.images||[]).flatMap(image=>{
   const url=publicSourceAsset(image.url,source),context=publicSourceAsset(image.sourcePage,source);
   if(!url||!context||image.role==='logo'||seenAssets.has(url)||image.width&&image.height&&(image.width<64||image.height<64))return [];
   const observed=new URL(context),expected=new URL(source);
   if(observed.origin!==expected.origin||observed.pathname.replace(/\/+$/,'')!==expected.pathname.replace(/\/+$/,''))return [];
   seenAssets.add(url);return [{...image,url}];
  }).slice(0,6);
  const sourceFigure=(image:typeof sourceImages[number])=>'<figure data-extracted-visual data-source-image><img src="'+esc(image.url)+'" alt="'+esc(image.alt)+'" loading="lazy" decoding="async"><figcaption>Image from <a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">the original '+esc(page.label)+' page</a></figcaption></figure>';
  const sourceHero=sourceImages[0]?sourceFigure(sourceImages[0]):'';
  const bodyCopy=paragraphs.length?'<section class="extracted-body" aria-label="Page content">'+paragraphs.map(value=>'<p>'+esc(value.slice(0,3000))+'</p>').join('')+'</section>':'';
  const gallery=sourceImages.length>1?'<section class="extracted-gallery" aria-label="Images from the original page">'+sourceImages.slice(1).map(sourceFigure).join('')+'</section>':'';
  return {slug,title:page.label,html:'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' | '+esc(businessName)+'</title><meta name="description" content="'+summary+'"><style>*{box-sizing:border-box}body{margin:0;background:#151923;color:#f7f5ef;font:16px/1.7 system-ui,sans-serif}a{color:inherit}nav{padding:24px 7%;display:flex;gap:20px;flex-wrap:wrap;align-items:center}nav a{min-height:44px;display:inline-flex;align-items:center;overflow-wrap:anywhere}main{max-width:1200px;margin:auto;padding:64px 7%}h1{font-size:clamp(2.25rem,7vw,5rem);line-height:1.08;letter-spacing:-.04em;overflow-wrap:anywhere}h2{font-size:clamp(1.25rem,3vw,2rem);line-height:1.3;overflow-wrap:anywhere}p{max-width:72ch}.extracted-body p{white-space:pre-line;overflow-wrap:anywhere}.extracted-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:24px;margin-block:32px}.extracted-gallery figure{margin:0}.extracted-gallery img{display:block;width:100%;height:auto;border-radius:12px}.extracted-gallery figcaption{font-size:.75rem}.extracted-topics{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:24px;margin-block:40px}.extracted-topic{padding:24px 0;border-top:1px solid currentColor}.extracted-source{display:inline-flex;min-height:44px;align-items:center;margin-block:20px}.site-footer{padding:32px 7%;border-top:1px solid #8886;display:flex;gap:24px;flex-wrap:wrap;justify-content:space-between}.site-footer div{display:flex;gap:20px;flex-wrap:wrap}details{font-size:.875rem;max-width:72ch;margin-top:32px}summary{cursor:pointer;min-height:44px}:focus-visible{outline:3px solid currentColor;outline-offset:4px}@media(max-width:650px){main{padding:36px 6%}nav{padding:20px 6%;gap:12px 20px}.extracted-topics{gap:12px}}</style></head><body><a href="#main-content" class="skip-link">Skip to content</a><nav aria-label="Main navigation"><a href="index.html">'+esc(businessName)+'</a><a href="services.html">Services</a><a href="about.html">About</a><a href="contact.html">Contact</a>'+navigation+'</nav><main id="main-content"><header class="extracted-hero" data-page-subject="'+esc([page.label,...headings].join(' '))+'"><div><h1>'+title+'</h1>'+(summary?'<p>'+summary+'</p>':'')+'</div>'+sourceHero+'</header>'+bodyCopy+gallery+(headings.length?'<div class="extracted-topics">'+headings.map(heading=>'<section class="extracted-topic"><h2>'+esc(heading)+'</h2></section>').join('')+'</div>':'')+'<a class="extracted-source" href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">View original '+esc(page.label)+' page →</a><details><summary>Source and reconstruction details</summary><p>This page uses the source page’s extracted title, description, body text, headings and available source images. Original interactions and full page content have not been reconstructed. Review before publishing.</p></details></main><footer class="site-footer"><strong>'+esc(businessName)+'</strong><div><a href="index.html">Home</a><a href="services.html">Services</a><a href="contact.html">Contact</a></div></footer></body></html>'};
 });
}

export function applyExtractedExperience(pages:GeneratedPage[],experience:WebsiteExperience,business:{businessName?:string;industry:string;services:string[];visualAssets?:VisualAsset[]}):GeneratedPage[]{
 const direction=businessArtDirection(business.industry,business.businessName||'Business');
 const dark=experience!=='standard';
 const css='<style id="forge-extracted-business-theme">body{background:'+(dark?direction.night:direction.paper)+';color:'+(dark?direction.paper:direction.ink)+';font-family:\''+direction.font+'\',sans-serif}h1,h2{font-family:\''+direction.font+'\',serif;letter-spacing:-.04em}a{color:'+(dark?direction.paper:direction.accent)+'}nav{border-bottom:1px solid '+(dark?'#ffffff30':'#00000025')+'}main{padding-bottom:64px}.skip-link{position:absolute;left:12px;top:-100px;background:white;color:#111;padding:12px 18px;z-index:100}.skip-link:focus{top:12px}.extracted-hero{display:grid;grid-template-columns:minmax(0,1fr);gap:32px;align-items:center}.extracted-hero:has(figure){grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.extracted-hero figure{margin:0}.extracted-hero img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:18px}.extracted-hero [data-source-image] img{aspect-ratio:auto;height:auto;object-fit:contain}.extracted-hero figcaption{font-size:.75rem;opacity:.7;margin-top:8px}@media(max-width:700px){.extracted-hero:has(figure){grid-template-columns:1fr}}</style>';
 const usedImages=new Set<string>();
 const branded=pages.map(page=>{
  let html=page.html.replace(/<style id="forge-extracted-business-theme">[\s\S]*?<\/style>/g,'').replace('</head>',css+'</head>');
  const subject=html.match(/data-page-subject="([^"]*)"/)?.[1]||page.title;
  const asset=relevantVisualAssets(subject,business.visualAssets||[])[0];
  const image=selectDiversePhoto(asset?[asset.url]:offeringPhotoCandidates(subject,business.industry),usedImages);
  if(image&&!html.includes('data-extracted-visual')){
   const caption=asset?'Illustrative image · '+asset.credit+' · '+asset.license:'Illustrative image · Unsplash';
   html=html.replace('</header>','<figure data-extracted-visual><img src="'+esc(image)+'" alt="'+esc(subject)+'" loading="lazy" decoding="async"><figcaption>'+esc(caption)+'</figcaption></figure></header>');
  }
  return {...page,html};
 });
 if(experience==='cinematic')return enhanceCinematicPages(branded);
 const images=relevantVisualAssets(business.industry,business.visualAssets||[]).map(asset=>asset.url);
 const plan=experience==='object-navigation'?objectNavigationPlan({...business,images}):null;
 return plan?branded.map(page=>({...page,html:page.html.replace(/(<main\b[^>]*>)/,'$1'+objectNavigationMarkup(plan))})):branded;
}

/** Builder tabs are not part of the exported website. Connect emitted source
 * pages from the actual documents so visitors can reach them from Home.
 */
export function connectExtractedPages(pages:GeneratedPage[],extras:GeneratedPage[]):GeneratedPage[]{
 const destinations=extras.filter(page=>/^[a-z0-9-]{1,64}$/.test(page.slug));
 if(!destinations.length)return pages;
 return pages.map(page=>{
  const links=destinations.filter(target=>target.slug!==page.slug&&!page.html.includes('href="'+target.slug+'.html"'));
  if(!links.length||!/<\/main>/i.test(page.html))return page;
  const navigation='<nav aria-label="More website pages" data-forge-source-navigation style="display:flex;flex-wrap:wrap;gap:12px;margin-block:2rem">'+links.map(target=>'<a style="display:inline-flex;align-items:center;min-height:44px;overflow-wrap:anywhere" href="'+target.slug+'.html">'+esc(target.title)+'</a>').join('')+'</nav>';
  return {...page,html:page.html.replace(/<\/main>/i,navigation+'</main>')};
 });
}
