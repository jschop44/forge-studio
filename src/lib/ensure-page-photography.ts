import type {GeneratedPage} from './business-site';
import {escapeHtml} from './export';
import {industryPhotos,photoIdentity} from './industry-photos';
import {licensedBusinessVisualAssets,type VisualAsset} from './visual-assets';

/** Attribution-free photos only. An image title matching the industry is not permission to reuse it. */
function verifiedPhotos(industry:string,assets:VisualAsset[],offerings:string[]):string[]{
 return licensedBusinessVisualAssets(industry,offerings,assets).map(asset=>asset.url);
}

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
 * Repair image-free pages after AI generation and source design reconstruction.
 * Never replace real source photos, invent a license, or reuse a photo elsewhere
 * in the site. The repair deliberately leaves unfamiliar niches text-led.
 */
export function ensurePagePhotography(pages:GeneratedPage[],industry:string,assets:VisualAsset[]=[],offerings:string[]=[]):GeneratedPage[]{
 const candidates=[...verifiedPhotos(industry,assets,offerings),...industryPhotos(industry)];
 const seen=new Set<string>(),pool=candidates.filter(url=>{const id=photoIdentity(url);if(seen.has(id))return false;seen.add(id);return true});
 if(!pool.length)return pages;
 const used=usedPhotoIds(pages);
 return pages.map(page=>{
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
