import type {GeneratedPage} from './business-site';
import {escapeHtml} from './export';
import {industryPhotos,photoIdentity,requiresFamilySafeReview} from './industry-photos';
import {cleanSourceText} from './source-text';
import {licensedBusinessVisualAssets,relevantVisualAssets,specificVisualOfferings,type VisualAsset} from './visual-assets';

/** Saved templates and lazy loaders often contain transparent placeholder
 * images. Those are not delivered, meaningful page photography.
 * Only clearly identified placeholders are removable; a real srcset takes
 * precedence over a fallback src, and unknown photos stay untouched. */
function placeholderImageSource(value:string):boolean{
 const src=value.trim();
 if(!src||/^(?:about:blank|javascript:|blob:|#)/i.test(src))return true;
 if(/^data:image\/(?:gif|svg\+xml)/i.test(src))return true;
 if(/^data:image\//i.test(src))return src.length<160;
 if(/^data:/i.test(src))return true;
 let file='';
 try{file=new URL(src,'https://example.invalid/').pathname.split('/').pop()||''}catch{return true}
 return /^(?:placeholder|blank|empty|transparent|spacer|pixel|tracking[-_]?pixel|loading|loader|no[-_]?image|image[-_]?(?:missing|not[-_]?found))(?:[-_.@a-z0-9]*)\.(?:gif|png|jpe?g|webp|avif|svg)$/i.test(file);
}
function attr(tag:string,name:'src'|'srcset'):string{
 return tag.match(new RegExp('\\s'+name+'\\s*=\\s*(["\\\'])(.*?)\\1','i'))?.[2]||'';
}
function placeholderImageTag(tag:string):boolean{
 const srcset=attr(tag,'srcset');
 if(srcset.split(',').some(item=>{
  const url=item.trim().split(/\s+/)[0];
  return url&&!placeholderImageSource(url);
 }))return false;
 return placeholderImageSource(attr(tag,'src'));
}

/** Inert HTML and CSS-hidden subtrees must not count as *visible* photos.
 * Static generated sites cannot execute template/noscript content or activate
 * hidden lazy-loader frames. Leave the original markup intact.
 */
function visibleMediaTags(html:string):string[]{
 const media:string[]=[],stack:{tag:string;hidden:boolean}[]=[];
 const ignored=new Set(['template','noscript','script','style','svg','iframe']);
 const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
 for(const match of html.matchAll(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>/gi)){
  const token=match[0];
  if(token.startsWith('<!--'))continue;
  const closing=/^<\/([a-z][a-z0-9:-]*)\b/i.exec(token);
  if(closing){
   const index=stack.findLastIndex(item=>item.tag===closing[1].toLowerCase());
   if(index>=0)stack.length=index;
   continue;
  }
  const opening=/^<([a-z][a-z0-9:-]*)\b/i.exec(token);
  if(!opening)continue;
  const tag=opening[1].toLowerCase(),attrs=token.slice(opening[0].length,-1);
  const style=attrs.match(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const declaration=String(style?.[1]||style?.[2]||'').replace(/\s+/g,'').toLowerCase();
  const hidden=Boolean(stack.at(-1)?.hidden)||ignored.has(tag)||
   /(?:^|\s)(?:hidden|inert)(?=\s|=|\/?>|$)/i.test(attrs)||
   /\saria-hidden\s*=\s*(?:"true"|'true'|true)(?=\s|\/?>|$)/i.test(attrs)||
   /(?:^|;)(?:display:none|visibility:hidden)(?:!important)?(?:;|$)/.test(declaration);
  if(!hidden&&['img','source','video'].includes(tag))media.push(token);
  if(!voids.has(tag)&&!token.endsWith('/>'))stack.push({tag,hidden});
 }
 return media;
}
/** Logos, icons and tracking pixels are not substitutes for real page photography. */
function hasContentPhoto(html:string):boolean{
 const tags=visibleMediaTags(html);
 for(const tag of tags.filter(value=>/^<img\b/i.test(value))){
  if(!attr(tag,'src')&&!attr(tag,'srcset'))continue;
  if(/\b(?:logo|logotype|brand-mark|icon|favicon|avatar|sprite|tracking|pixel|spacer)\b/i.test(tag))continue;
  if(/\bsrc\s*=\s*["'][^"']+\.svg(?:[?#][^"']*)?["']/i.test(tag))continue;
  if(/\b(?:width|height)\s*=\s*["']?[01](?:["'\s>])/i.test(tag))continue;
  if(!placeholderImageTag(tag))return true;
 }
 for(const tag of tags.filter(value=>/^<source\b/i.test(value))){
  const srcset=attr(tag,'srcset');
  if(srcset.split(',').some(item=>{
   const src=item.trim().split(/\s+/)[0];return src&&!placeholderImageSource(src);
  }))return true;
 }
 return tags.some(value=>/^<video\b/i.test(value)&&/\s+poster\s*=/.test(value));
}
function usedPhotoIds(pages:GeneratedPage[]):Set<string>{
 const ids=new Set<string>();
 for(const page of pages){
  for(const tag of visibleMediaTags(page.html))for(const match of tag.matchAll(/\s(?:src|srcset|poster)\s*=\s*["']([^"']+)["']/gi)){
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
      /<(?:picture|video)\b/i.test(article))return article;
   // An image element that only points to a spinner/blank placeholder does
   // not make this a photographed card. Remove it even when no matching
   // licensed replacement exists, leaving an intentional text-led card.
   const cleaned=article.replace(/<img\b[^>]*>/gi,tag=>placeholderImageTag(tag)?'':tag);
   if(/<img\b/i.test(cleaned))return article;
   const heading=cleanSourceText(article.match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i)?.[1]||'',100);
   if(!heading||requiresFamilySafeReview(industry+' '+heading)||
      !specificVisualOfferings([heading]).length)return cleaned;
   const exact=verified.find(asset=>!used.has(photoIdentity(asset.url))&&
    relevantVisualAssets(heading,[asset]).length>0);
   if(!exact)return cleaned;
   used.add(photoIdentity(exact.url));
   const picture='<img class="service-photo" data-forge-verified-offering-photo="true" src="'+
    escapeHtml(exact.url)+'" alt="'+escapeHtml(heading)+'" loading="lazy" decoding="async">';
   return cleaned.replace(/^<article\b[^>]*>/i,opening=>opening+picture);
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
