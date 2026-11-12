import {z} from 'zod';
export const VisualAssetSchema=z.object({url:z.string().url().max(2000).refine(url=>/^https:\/\/(?:upload\.wikimedia\.org|images\.unsplash\.com|images\.pexels\.com)\//.test(url)),title:z.string().min(3).max(350),credit:z.string().max(250),source:z.string().url().max(2000).refine(url=>/^https:\/\/(?:commons\.wikimedia\.org|unsplash\.com|www\.pexels\.com)\//.test(url)),license:z.string().max(120)}).strict();
export type VisualAsset=z.infer<typeof VisualAssetSchema>;
const stop=new Set(['and','the','for','with','our','business','professional','services','service','company','shop','store','club','equipment','information','local','general','products','supplies','care','modern','premium','independent','small','offers','provide','provides','offering','specializing','specialise','specialize','customers','clients']);
export function nicheTerms(industry:string):string[]{return industry.replace(/\bIT\b/g,'information technology').replace(/\bAI\b/g,'artificial intelligence').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(term=>(term.length>=3||term.length>=2&&/[^\u0000-\u007f]/u.test(term))&&!stop.has(term))}
const visualDescriptors=new Set(['photography','practice','group','retail','wholesale','agency','studio','training','center','centre','consulting','sales']);
export function visualSubjectTerms(industry:string):string[]{const terms=nicheTerms(industry),specific=terms.filter(term=>!visualDescriptors.has(term));return specific.length?specific:terms}
/** Require subject evidence; a broad stock category is not evidence of relevance. */
export function relevantVisualAssets(industry:string,assets:unknown[]):VisualAsset[]{
 const terms=visualSubjectTerms(industry),seen=new Set<string>();if(!terms.length)return [];
 const sensitive=/\b(?:weapons?|porn\w*|erotic|nude|nudity|gore|cannabis|marijuana|sex(?:ual)?|dildos?|vibrators?)\b/i;
 return assets.flatMap(value=>{const result=VisualAssetSchema.safeParse(value);if(!result.success)return [];const asset=result.data,title=asset.title.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();if(sensitive.test(title.replace(/_/g,' '))||/geograph\.org|\b(?:logos?|maps?|diagrams?|advertisements?|wounds?|bleeding|blood|surgery|extractions?)\b/i.test(title)||!terms.every(term=>{const stem=term.length>4&&term.endsWith('s')&&!term.endsWith('ss')?term.slice(0,-1):term;return new RegExp('(?<![\\p{L}\\p{N}])'+stem+'(?:s|ing)?(?![\\p{L}\\p{N}])','iu').test(title)})||seen.has(asset.url.split('?')[0])||!(/\b(?:CC0|CC BY|public domain)\b/i.test(asset.license)||(asset.license==='Pexels License'&&new URL(asset.url).hostname==='images.pexels.com'&&new URL(asset.source).hostname==='www.pexels.com'))||/NC|ND/i.test(asset.license.replace(/public domain/i,'')))return [];seen.add(asset.url.split('?')[0]);return [asset]}).slice(0,48);
}


/** Search actual customer-facing offerings, not generic page labels or calls to action. */
export function specificVisualOfferings(offerings:string[]):string[]{
 const generic=new Set('about contact team explore learn request book booking bookings appointment appointments schedule quote quotes availability available pricing inquiry information details visit us our your more support today general options quality solutions help get started'.split(' '));
 return [...new Set(offerings.filter(value=>typeof value==='string').map(value=>value.trim()).filter(value=>value.length>=3&&value.length<=100))]
  .filter(value=>!/\b(?:halloween|haunted|horror|scary|spooky|gore|blood|violence|weapons?|adult|erotic|drugs?|cannabis|marijuana)\b/i.test(value)&&visualSubjectTerms(value).some(term=>!generic.has(term))).slice(0,3);
}

/** Source license AND subject evidence must both pass, even for a specific menu item. */
export function licensedBusinessVisualAssets(industry:string,offerings:string[],assets:unknown[]):VisualAsset[]{
 const matches=[
  ...relevantVisualAssets(industry,assets),
  ...specificVisualOfferings(offerings).flatMap(service=>relevantVisualAssets(service,assets))
 ];
 const seen=new Set<string>();
 return matches.filter(asset=>{
  if(!/^(?:CC0(?:\s|$)|public domain(?:\s|$)|Pexels License$|Unsplash License$)/i.test(asset.license))return false;
  const parsed=new URL(asset.url),identity=parsed.origin+parsed.pathname;
  if(seen.has(identity))return false;
  seen.add(identity);return true;
 }).slice(0,48);
}
