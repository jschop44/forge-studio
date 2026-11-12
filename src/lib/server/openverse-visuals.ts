import {licensedBusinessVisualAssets,visualSubjectTerms,type VisualAsset} from '../visual-assets';

/** Anonymous Openverse API: only indexed CC0/public-domain photographic files.
 * Other Creative Commons licenses require attribution and are intentionally rejected.
 * Host allowlisting is enforced again by VisualAssetSchema, not by search metadata.
 */
const researchCache=new WeakMap<typeof fetch,Map<string,{until:number;photos:VisualAsset[]}>>();
type OpenversePhoto={title?:string;url?:string;foreign_landing_url?:string;license?:string;creator?:string;category?:string;filetype?:string;width?:number;height?:number;mature?:boolean;tags?:{name?:string}[]};
export async function discoverOpenverseVisuals(subject:string,fetcher:typeof fetch=fetch):Promise<VisualAsset[]>{
 const terms=visualSubjectTerms(subject);if(!terms.length)return [];
 const key=terms.join(' ');let cache=researchCache.get(fetcher);if(!cache){cache=new Map();researchCache.set(fetcher,cache)}
 const hit=cache.get(key);if(hit&&hit.until>Date.now())return structuredClone(hit.photos);
 const url=new URL('https://api.openverse.org/v1/images/');
 url.search=new URLSearchParams({q:key,license:'cc0,pdm',page_size:'20',mature:'false',filter_dead:'true'}).toString();
 let matches:VisualAsset[]=[];
 try{
  const response=await fetcher(url,{headers:{Accept:'application/json','User-Agent':'ForgeStudio/1.0 (CC0 business photos; https://forge-studio-preview.stands-old-3h.workers.dev)'},signal:AbortSignal.timeout(4300),redirect:'error'});
  if(response.ok){
   if(Number(response.headers.get('content-length'))>300000){await response.body?.cancel();throw Error('Oversized photo research')}
   const body=await response.text();if(body.length>300000)throw Error('Oversized photo research');
   const json=JSON.parse(body) as {results?:OpenversePhoto[]};
   const candidates=(Array.isArray(json.results)?json.results:[]).filter(photo=>{
    const license=String(photo.license||'').toLowerCase();
    return (license==='cc0'||license==='pdm')&&!photo.mature&&
     photo.category==='photograph'&&/^(?:jpe?g|png|webp)$/i.test(photo.filetype||'')&&
     Number(photo.width)>=1600&&Number(photo.height)>=900;
   }).map(photo=>{
    const tags=(Array.isArray(photo.tags)?photo.tags:[]).map(tag=>tag.name||'').filter(tag=>/^[\p{L}\p{N} -]{3,40}$/u.test(tag)).slice(0,24).join(' ');
    return {url:photo.url,title:[photo.title,tags].filter(Boolean).join(' ').slice(0,350),credit:String(photo.creator||'').slice(0,250),
     source:photo.foreign_landing_url,license:photo.license==='cc0'?'CC0':'Public domain'};
   });
   matches=licensedBusinessVisualAssets(subject,[],candidates);
  }else await response.body?.cancel();
 }catch{/* Commons/curated fallback must remain available if this free source is down. */}
 if(cache.size>=100)cache.delete(cache.keys().next().value!);
 cache.set(key,{until:Date.now()+(matches.length?3600000:30000),photos:matches});
 return structuredClone(matches);
}
