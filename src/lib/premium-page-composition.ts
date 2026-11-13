import type {GeneratedPage} from './business-site';
import {escapeHtml} from './export';
import {industryPhotos,photoIdentity,requiresFamilySafeReview,servicePhoto} from './industry-photos';
import {licensedBusinessVisualAssets,relevantVisualAssets,type VisualAsset} from './visual-assets';
import {premiumEditorialStyles} from './premium-page-styles';
import {businessArtDirection} from './business-art-direction';

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
  return {url:asset.url,label:exact||'',alt:exact?exact+' — '+brief.industry+' photography':brief.industry+' photography'};
 });
 general.push(...industryPhotos(brief.industry).map(url=>({url,label:'',alt:brief.industry+' photography'})));
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
type EditorialStory={kicker:string;heading:string;support:string;link:string;href:string};
type EditorialPage='index'|'services'|'about'|'contact';
type StoryVoice={index:string;services:string;about:string;contact:string;kicker:string};
const storyVoices:Record<string,StoryVoice>={
 produce:{kicker:'From the market',index:'Fresh finds, in focus.',services:'Explore the selection.',about:'Get to know the stand.',contact:'Questions about what’s fresh?'},
 coffee:{kicker:'From the counter',index:'See what’s brewing.',services:'A closer look at the menu.',about:'The story behind the counter.',contact:'Start a conversation.'},
 dining:{kicker:'Around the table',index:'A closer look at the menu.',services:'Explore every offering.',about:'Behind the dining experience.',contact:'Plan your next visit.'},
 baseball:{kicker:'Inside the game',index:'Gear up for what’s next.',services:'Explore the equipment.',about:'More about the team.',contact:'Ask about the lineup.'},
 sport:{kicker:'Made for movement',index:'Ready for the next play.',services:'Explore what’s on offer.',about:'The story behind the sport.',contact:'Get in the game.'},
 nature:{kicker:'Closer to nature',index:'Explore what’s growing.',services:'Find the right offering.',about:'Rooted in the details.',contact:'Let’s talk about your plans.'},
 clinical:{kicker:'Care and clarity',index:'Explore your care options.',services:'Understand the services.',about:'Learn about this practice.',contact:'Questions about care?'},
 property:{kicker:'Spaces and places',index:'Explore the possibilities.',services:'Discover the services.',about:'The story behind the work.',contact:'Start with a conversation.'},
 beauty:{kicker:'The details matter',index:'A closer look at style.',services:'Explore your options.',about:'Get to know the studio.',contact:'Ask about your next visit.'},
 books:{kicker:'For curious minds',index:'Explore the collection.',services:'Discover what’s available.',about:'The story behind the shelves.',contact:'Get in touch.'},
 music:{kicker:'Craft and expression',index:'Explore the sound of the work.',services:'Find the right service.',about:'The work behind the music.',contact:'Ask about the next step.'},
 marine:{kicker:'Around the water',index:'Explore life on the water.',services:'See what’s available.',about:'The story behind the service.',contact:'Find your next step.'},
 artisan:{kicker:'Made with intention',index:'A closer look at the craft.',services:'Explore the collection.',about:'The detail behind the work.',contact:'Ask about the process.'},
 technology:{kicker:'Ideas in motion',index:'Explore what’s possible.',services:'See how it works.',about:'The thinking behind the work.',contact:'Start a project conversation.'},
 legal:{kicker:'Clear next steps',index:'Learn about the practice.',services:'Explore areas of service.',about:'Learn about the team.',contact:'Ask about your options.'},
 finance:{kicker:'A clearer picture',index:'Explore the services.',services:'Understand your options.',about:'Get to know the practice.',contact:'Start a conversation.'}
};
function editorialStory(brief:EditorialBrief,slug:EditorialPage,key:string):EditorialStory{
 const first=brief.services[0]||brief.industry;
 const second=brief.services[1];
 const offeringExamples=second?first+' and '+second:first;
 const voice=storyVoices[key];
 const titles=voice||{kicker:brief.industry,index:'Discover the details.',services:'Explore what’s available.',about:'Get to know the business.',contact:'Start with a question.'};
 const messages:Record<EditorialPage,EditorialStory>={
  index:{kicker:'01 / '+titles.kicker,heading:titles.index,support:'Explore '+offeringExamples+' at '+brief.businessName+'. Browse the details and ask about current availability.',link:'Browse the offerings',href:'services.html'},
  services:{kicker:'02 / '+titles.kicker,heading:titles.services,support:'Take a closer look at '+offeringExamples+'. Contact '+brief.businessName+' for current choices, details and availability.',link:'Ask a question',href:'contact.html'},
  about:{kicker:'03 / '+titles.kicker,heading:titles.about,support:brief.description,link:'See what we offer',href:'services.html'},
  contact:{kicker:'04 / '+titles.kicker,heading:titles.contact,support:'Ask '+brief.businessName+' about '+offeringExamples+' or the next step that fits your needs.',link:'Explore the offerings',href:'services.html'}
 };
 return messages[slug];
}
function composeSection(brief:EditorialBrief,slug:EditorialPage,photos:EditorialPhoto[]):string{
 if(!photos.length)return '';
 const s=escapeHtml;
 const key=businessArtDirection(brief.industry,brief.businessName).key;
 const message=editorialStory(brief,slug,key);
 const cards=photos.map((photo,index)=>'<figure class="forge-editorial__photo">'+
  '<img src="'+s(photo.url)+'" alt="'+s(photo.alt)+'" loading="'+(index===0&&slug==='index'?'eager':'lazy')+'" decoding="async">'+
  (photo.label?'<figcaption>'+s(photo.label)+'</figcaption>':'')+'</figure>').join('');
 return '<section class="forge-editorial" data-editorial-theme="'+s(key)+'" data-editorial-page="'+s(slug)+'" aria-label="'+s(brief.industry+' photo collection')+'">'+
  '<div class="forge-editorial__heading"><div><p class="eyebrow">'+s(message.kicker)+'</p><h2>'+s(message.heading)+'</h2></div><p>'+s(message.support)+'</p></div>'+
  '<div class="forge-editorial__gallery" data-count="'+photos.length+'">'+cards+'</div>'+
  '<div class="forge-editorial__foot"><small>'+s(brief.businessName)+' / '+s(brief.industry)+'</small><a href="'+s(message.href)+'">'+s(message.link)+' &rarr;</a></div>'+
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
  const section=composeSection(brief,page.slug as EditorialPage,extra);
  let html=page.html.replace(/<\/head>/i,'<style id="forge-premium-editorial-styles">'+premiumEditorialStyles+'</style></head>');
  const insertBefore=page.slug==='index'?/<section class="section-heading"/i:page.slug==='services'?/<div class="cards"/i:page.slug==='about'?/<section class="contact-panel"/i:null;
  if(insertBefore&&insertBefore.test(html))html=html.replace(insertBefore,section+'$&');
  else html=html.replace(/<\/main>/i,section+'</main>');
  return {...page,html};
 });
}
