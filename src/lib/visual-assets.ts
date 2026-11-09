import {z} from 'zod';
export const VisualAssetSchema=z.object({url:z.string().url().max(2000).refine(url=>/^https:\/\/(?:upload\.wikimedia\.org|images\.unsplash\.com)\//.test(url)),title:z.string().min(3).max(350),credit:z.string().max(250),source:z.string().url().max(2000).refine(url=>/^https:\/\/(?:commons\.wikimedia\.org|unsplash\.com)\//.test(url)),license:z.string().max(120)}).strict();
export type VisualAsset=z.infer<typeof VisualAssetSchema>;
const stop=new Set(['and','the','for','with','our','business','professional','services','service','company','shop','store','club','equipment','information','local','general','products','supplies']);
export function nicheTerms(industry:string):string[]{return industry.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(term=>term.length>3&&!stop.has(term))}
/** Require subject evidence; a broad stock category is not evidence of relevance. */
export function relevantVisualAssets(industry:string,assets:unknown[]):VisualAsset[]{
 const allTerms=nicheTerms(industry),specific=allTerms.filter(term=>!['photography','practice','group','retail','agency','studio','training','center','centre','consulting'].includes(term)),terms=specific.length?specific:allTerms,seen=new Set<string>();if(!terms.length)return [];
 const sensitive=/\b(?:weapon|porn|erotic|nudity|gore|cannabis|marijuana)\b/i;
 return assets.flatMap(value=>{const result=VisualAssetSchema.safeParse(value);if(!result.success)return [];const asset=result.data,title=asset.title.toLowerCase();if(sensitive.test(title)||/geograph\.org|\b(?:logos?|maps?|diagrams?|advertisements?|wounds?|bleeding|blood|surgery|extractions?)\b/i.test(title)||!terms.some(term=>new RegExp('\\b'+term+'(?:s|ing)?\\b','i').test(title))||seen.has(asset.url.split('?')[0])||!/\b(?:CC0|CC BY|public domain)\b/i.test(asset.license)||/NC|ND/i.test(asset.license.replace(/public domain/i,'')))return [];seen.add(asset.url.split('?')[0]);return [asset]}).slice(0,10);
}
