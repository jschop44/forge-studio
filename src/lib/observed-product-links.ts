import {decodeSourceEntities} from './source-text';
import {escapeHtml as escape} from './export';
import {usefulSourcePage} from './source-reuse-policy';
import type {GeneratedPage} from './business-site';

export type ObservedDestination={label:string;path:string};
const normalized=(value:string)=>decodeSourceEntities(String(value||'').replace(/<[^>]+>/g,' ')).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

/** Link products to genuinely observed first-party category destinations.
 * When source evidence is absent, keep existing local paths; never guess URLs.
 * These are outbound links to the original business, not reconstructed checkouts.
 */
export function linkObservedOfferingDestinations(
 pages:GeneratedPage[],sourceUrl:string|undefined,navigation:readonly ObservedDestination[]|undefined,mode:string
):GeneratedPage[]{
 if(mode==='new'||!sourceUrl||!navigation?.length)return pages;
 let source:URL;
 try{
  source=new URL(sourceUrl);
  if(source.protocol!=='https:'||source.username||source.password)return pages;
 }catch{return pages}
 const destinations=new Map<string,string>();
 for(const item of navigation.slice(0,80)){
  if(!item||typeof item.label!=='string'||typeof item.path!=='string'||item.path.length>400)continue;
  if(!item.path.startsWith('/')||item.path.startsWith('//')||!usefulSourcePage({path:item.path,label:item.label}))continue;
  let url:URL;
  try{url=new URL(item.path,source)}catch{continue}
  if(url.origin!==source.origin||url.protocol!=='https:'||url.username||url.password)continue;
  const key=normalized(item.label);
  if(!key||key.length>95||destinations.has(key))continue;
  url.hash='';
  destinations.set(key,url.href);
 }
 if(!destinations.size)return pages;
 return pages.map(page=>{
  const html=page.html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/gi,article=>{
   if(!/\bservice-card\b/i.test(article.slice(0,250)))return article;
   const heading=article.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]||'';
   const label=normalized(heading),href=destinations.get(label);
   if(!href)return article;
   return article.replace(/<a\b[^>]*\bhref=["']contact\.html["'][^>]*>[\s\S]*?<\/a>/i,
    '<a data-forge-observed-category href="'+escape(href)+'" target="_blank" rel="noopener noreferrer" aria-label="View '+escape(decodeSourceEntities(heading.replace(/<[^>]*>/g,' ')))+' on original source website (opens a new tab)">View source category ↗</a>');
  });
  return html===page.html?page:{...page,html};
 });
}
