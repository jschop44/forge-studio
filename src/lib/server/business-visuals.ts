import {relevantVisualAssets,nicheTerms,type VisualAsset} from '../visual-assets';
const cache=new Map<string,{until:number;assets:VisualAsset[]}>();
const clean=(value:unknown)=>typeof value==='string'?value.replace(/<[^>]*>/g,' ').replace(/&(?:amp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim():'';
/** Free Commons discovery, restricted to image files with a reusable license and niche evidence. */
export async function discoverBusinessVisuals(industry:string,fetcher:typeof fetch=fetch):Promise<VisualAsset[]>{
 const terms=nicheTerms(industry);if(!terms.length)return [];
 const preferred:[RegExp,string][]=[[/dental|dentist/i,'dental chair'],[/medical|healthcare/i,'medical clinic interior'],[/pharmacy/i,'pharmacy interior'],[/plumb/i,'plumbing equipment'],[/roof/i,'roofing work'],[/legal|law/i,'law library'],[/account|bookkeep/i,'accounting desk'],[/educat|school|tutor/i,'classroom teacher'],[/veterinar/i,'veterinarian clinic']];
 const query=preferred.find(([pattern])=>pattern.test(industry))?.[1]||terms.join(' ');
 const key=terms.join(' '),saved=cache.get(key);if(saved&&saved.until>Date.now())return saved.assets;
 const url=new URL('https://commons.wikimedia.org/w/api.php');url.search=new URLSearchParams({action:'query',generator:'search',gsrnamespace:'6',gsrsearch:query+' filetype:bitmap -filetype:svg',gsrlimit:'10',prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'1600',format:'json'}).toString();
 try{
  const response=await fetcher(url,{headers:{'User-Agent':'ForgeStudio/1.0 (business visual research; https://forge-studio-preview.stands-old-3h.workers.dev)','Accept':'application/json'},signal:AbortSignal.timeout(4500),redirect:'error'});
  if(!response.ok)return [];const raw=await response.text();if(raw.length>300000)return [];
  const data=JSON.parse(raw) as {query?:{pages?:Record<string,{title?:string;imageinfo?:{mime?:string;thumburl?:string;url?:string;descriptionurl?:string;extmetadata?:Record<string,{value?:string}>}[]}>}};
  const candidates=Object.values(data.query?.pages||{}).flatMap(page=>{const info=page.imageinfo?.[0],meta=info?.extmetadata;if(!info||!/^image\/(jpeg|png|webp)$/.test(info.mime||''))return [];return [{url:info.thumburl||info.url,title:(clean(page.title?.replace(/^File:/,''))+' '+clean(meta?.ImageDescription?.value)).slice(0,350),credit:clean(meta?.Artist?.value).slice(0,250),source:info.descriptionurl,license:clean(meta?.LicenseShortName?.value)}]});
  const assets=relevantVisualAssets(industry,candidates);if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+3600000,assets});return assets;
 }catch{return []}
}
