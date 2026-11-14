import type {GeneratedPage} from './business-site';
import {escapeHtml} from './export';
import {industryPhotos,photoIdentity,requiresFamilySafeReview} from './industry-photos';
import {cleanSourceText} from './source-text';
import {licensedBusinessVisualAssets,relevantVisualAssets,specificVisualOfferings,type VisualAsset} from './visual-assets';

/** Logos, icons and tracking pixels are not substitutes for real page photography. */
function hasContentPhoto(html:string):boolean{
 for(const match of html.matchAll(/<img\b[^>]*>/gi)){
  const tag=match[0];
  if(!/\s(?:src|srcset)\s*=\s*(?:"[^"]+"|'[^']+')/i.test(tag))continue;
  if(/\b(?:logo|logotype|brand-mark|icon|favicon|avatar|sprite|tracking|pixel|spacer)\b/i.test(tag))continue;
  if(/\bsrc\s*=\s*["'][^"']+\.svg(?:[?#][^"']*)?["']/i.test(tag))continue;
  if(/\b(?:width|height)\s*=\s*["']?[01](?:["'\s>])/i.test(tag))continue;
  return true;
 }
 return /<picture\b/i.test(html)||/<video\b[^>]*\bposter\s*=/i.test(html);
}

function usedPhotoIds(pages:GeneratedPage[]):Set<string>{
 const ids=new Set<string>();
 for(const page of pages){
  for(const match of page.html.matchAll(/\s(?:src|srcset|poster)\s*=\s*["']([^"']+)["']/gi)){
   for(const value of match[1].split(',')){
    const url=value.trim().split(/\s+/)[0];
    if(/^https?:\/\//i.test(url))ids.add(photoIdentity(url));
   }
  }
 }
 return ids;
}

/**
 * Repair missing *offering-card* photos before filling image-free pages.
 * A page with one hero image can still have a dozen empty offering cards.
 * Only reuse assets whose no-attribution license metadata and exact offering
 * subject were verified. Never use industry-wide stock as a product picture.
 */
function repairOfferingCards(pages:GeneratedPage[],industry:string,verified:VisualAsset[],used:Set<string>):GeneratedPage[]{
 const output=pages.map(page=>({...page}));
 // Save scarce niche-matched assets for the detailed catalog before homepage teasers.
 const ordered=[...output.filter(page=>page.slug==='services'),...output.filter(page=>page.slug!=='services')];
 for(const page of ordered){
  page.html=page.html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/gi,article=>{
   const tag=article.match(/^<article\b[^>]*>/i)?.[0]||'';
   if(!/\bclass\s*=\s*["'][^"']*\bservice-card\b/i.test(tag)||
      /<(?:img|picture|video)\b/i.test(article))return article;
   const heading=cleanSourceText(article.match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i)?.[1]||'',100);
   if(!heading||requiresFamilySafeReview(industry+' '+heading)||
      !specificVisualOfferings([heading]).length)return article;
   const exact=verified.find(asset=>!used.has(photoIdentity(asset.url))&&
    relevantVisualAssets(heading,[asset]).length>0);
   if(!exact)return article;
   used.add(photoIdentity(exact.url));
   const picture='<img class="service-photo" data-forge-verified-offering-photo="true" src="'+
    escapeHtml(exact.url)+'" alt="'+escapeHtml(heading)+'" loading="lazy" decoding="async">';
   return article.replace(/^<article\b[^>]*>/i,opening=>opening+picture);
  });
 }
 return output;
}

/**
 * Repair missing offering pictures and image-free pages after AI generation.
 * Never replace real source photos, invent a license, or reuse a photo elsewhere
 * in the site. Leave unfamiliar or unmatched offerings text-led.
 */
export function ensurePagePhotography(pages:GeneratedPage[],industry:string,assets:VisualAsset[]=[],offerings:string[]=[]):GeneratedPage[]{
 const verified=licensedBusinessVisualAssets(industry,offerings,assets);
 const used=usedPhotoIds(pages);
 const repaired=repairOfferingCards(pages,industry,verified,used);
 const candidates=[...verified.map(asset=>asset.url),...industryPhotos(industry)];
 const seen=new Set<string>(),pool=candidates.filter(url=>{
  const id=photoIdentity(url);if(seen.has(id))return false;seen.add(id);return true;
 });
 if(!pool.length)return repaired;
 return repaired.map(page=>{
  if(hasContentPhoto(page.html)||!/<\/(?:main|body)\s*>/i.test(page.html))return page;
  const photo=pool.find(url=>!used.has(photoIdentity(url)));
  if(!photo)return page;
  used.add(photoIdentity(photo));
  const figure='<figure data-forge-auto-photo="true" style="margin:clamp(24px,5vw,64px) auto;max-width:1160px;width:94%;overflow:hidden;border-radius:16px">'
   +'<img src="'+escapeHtml(photo)+'" alt="'+escapeHtml(industry+' photography')+'" loading="lazy" decoding="async" style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover"></figure>';
  const html=/<\/main\s*>/i.test(page.html)?page.html.replace(/<\/main\s*>/i,figure+'</main>'):page.html.replace(/<\/body\s*>/i,figure+'</body>');
  return {...page,html};
 });
}
