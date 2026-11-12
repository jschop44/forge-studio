import type {GeneratedPage} from './business-site';
import {escapeHtml} from './export';
import {industryPhotos,photoIdentity,requiresFamilySafeReview,servicePhoto} from './industry-photos';
import {licensedBusinessVisualAssets,relevantVisualAssets,type VisualAsset} from './visual-assets';
import {premiumEditorialStyles} from './premium-page-styles';

type EditorialBrief={
 businessName:string;industry:string;description:string;services:string[];visualAssets?:VisualAsset[];
};
type EditorialPhoto={url:string;label:string;alt:string};

/** Editorial imagery must be from a known niche or a verified, reuse-safe asset.
 * Reuse across *different pages* is desirable for brand continuity, but never
 * repeat a photo within one page, including its hero and product cards.
 */
function photoCollection(brief:EditorialBrief):{general:EditorialPhoto[];offerings:EditorialPhoto[]}{
 if(requiresFamilySafeReview(brief.industry))return {general:[],offerings:[]};
 const known=licensedBusinessVisualAssets(brief.industry,brief.services,brief.visualAssets||[]);
 const general:EditorialPhoto[]=known.map(asset=>{
  const exact=brief.services.find(service=>relevantVisualAssets(service,[asset]).length>0);
  return {url:asset.url,label:exact||'Behind the details',alt:exact?exact+' — '+brief.industry+' photography':brief.industry+' photography'};
 });
 general.push(...industryPhotos(brief.industry).map(url=>({url,label:'A closer look',alt:brief.industry+' photography'})));
 const offerings:EditorialPhoto[]=brief.services.flatMap(service=>{
  if(requiresFamilySafeReview(service+' '+brief.industry))return [];
  const exact=known.filter(asset=>relevantVisualAssets(service,[asset]).length>0);
  return [
   ...exact.map(asset=>({url:asset.url,label:service,alt:service+' photography'})),
   ...(servicePhoto(service,brief.industry)?[{url:servicePhoto(service,brief.industry)!,label:service,alt:service+' photography'}]:[])
  ];
 });
 return {general,offerings};
}
function sourceImages(html:string):Set<string>{
 const result=new Set<string>();
 for(const match of html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)){
  const url=match[1].trim();if(/^https?:\/\//i.test(url))result.add(photoIdentity(url));
 }
 for(const match of html.matchAll(/\b(?:srcset|poster)\s*=\s*["']([^"']+)["']/gi)){
  for(const value of match[1].split(',')){
   const url=value.trim().split(/\s+/)[0];if(/^https?:\/\//i.test(url))result.add(photoIdentity(url));
  }
 }
 return result;
}
function choosePhotos(html:string,slug:string,photos:{general:EditorialPhoto[];offerings:EditorialPhoto[]}):EditorialPhoto[]{
 const existing=sourceImages(html);
 const order=slug==='services'?[...photos.offerings,...photos.general]:[...photos.general,...photos.offerings];
 const pool=order.filter((photo,index)=>order.findIndex(value=>photoIdentity(value.url)===photoIdentity(photo.url))===index&&!existing.has(photoIdentity(photo.url)));
 if(!pool.length)return [];
 const shift=slug==='index'?0:slug==='services'?1:slug==='about'?2:3;
 const rotated=[...pool.slice(shift%pool.length),...pool.slice(0,shift%pool.length)];
 // A bento gallery gives pages 2–3 additional images, rather than one token
 // photo. One or two safe results never cause unrelated placeholders.
 return rotated.slice(0,Math.min(3,Math.max(2,4-existing.size)));
}
function composeSection(brief:EditorialBrief,slug:string,photos:EditorialPhoto[]):string{
 if(!photos.length)return '';
 const s=escapeHtml,service=brief.services[0]||brief.industry;
 const messages:Record<string,{kicker:string;heading:string;support:string;link:string;href:string}>={
  index:{kicker:'An introduction',heading:'Discover the details.',support:'Explore '+service+' and take a closer look at what '+brief.businessName+' offers.',link:'Explore '+(brief.services.length?'our offerings':'what we do'),href:'services.html'},
  services:{kicker:'The collection',heading:'Closer to what matters.',support:'Get to know the products and services that make up '+brief.businessName+'. Ask the team for current details and availability.',link:'Talk to the team',href:'contact.html'},
  about:{kicker:'The story',heading:'Get to know '+brief.businessName+'.',support:brief.description,link:'Explore our offerings',href:'services.html'},
  contact:{kicker:'Explore more',heading:'Find your next step.',support:'Browse the details, discover our offerings and get in touch to ask about current options.',link:'Browse products and services',href:'services.html'}
 };
 const message=messages[slug]||messages.index;
 const cards=photos.map((photo,index)=>'<figure class="forge-editorial__photo">'+
  '<img src="'+s(photo.url)+'" alt="'+s(photo.alt)+'" loading="'+(index===0&&slug==='index'?'eager':'lazy')+'" decoding="async">'+
  '<figcaption>'+s(photo.label)+'</figcaption></figure>').join('');
 return '<section class="forge-editorial" aria-label="'+s(brief.industry+' photo collection')+'">'+
  '<div class="forge-editorial__heading"><div><p class="eyebrow">'+s(message.kicker)+' / '+s(brief.industry)+'</p><h2>'+s(message.heading)+'</h2></div><p>'+s(message.support)+'</p></div>'+
  '<div class="forge-editorial__gallery" data-count="'+photos.length+'">'+cards+'</div>'+
  '<div class="forge-editorial__foot"><small>'+s(brief.businessName)+' / Explore</small><a href="'+s(message.href)+'">'+s(message.link)+' &rarr;</a></div>'+
  '</section>';
}
/** Upgrades the actual exported/generated pages, not only the preview shell.
 * No invented business facts, no generic stock, no extra routes and no new API.
 */
export function enrichGeneratedBusinessPages(pages:GeneratedPage[],brief:EditorialBrief):GeneratedPage[]{
 const photos=photoCollection(brief);
 return pages.map(page=>{
  if(!['index','services','about','contact'].includes(page.slug)||!/<\/main>/i.test(page.html)||!/<\/head>/i.test(page.html))return page;
  if(page.html.includes('class="forge-editorial"'))return page;
  const extra=choosePhotos(page.html,page.slug,photos);
  if(!extra.length)return page;
  const section=composeSection(brief,page.slug,extra);
  let html=page.html.replace(/<\/head>/i,'<style id="forge-premium-editorial-styles">'+premiumEditorialStyles+'</style></head>');
  const insertBefore=page.slug==='index'?/<section class="section-heading"/i:page.slug==='services'?/<div class="cards"/i:page.slug==='about'?/<section class="contact-panel"/i:null;
  if(insertBefore&&insertBefore.test(html))html=html.replace(insertBefore,section+'$&');
  else html=html.replace(/<\/main>/i,section+'</main>');
  return {...page,html};
 });
}
