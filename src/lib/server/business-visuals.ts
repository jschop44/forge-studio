import {relevantVisualAssets,nicheTerms,type VisualAsset} from '../visual-assets';
type ResearchState={cache:Map<string,{until:number;assets:VisualAsset[]}>;pending:Map<string,Promise<VisualAsset[]>>};
const providers=new WeakMap<typeof fetch,ResearchState>();
const clean=(value:unknown)=>typeof value==='string'?value.replace(/<[^>]*>/g,' ').replace(/&(?:amp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim():'';
/** Free Commons discovery, restricted to image files with a reusable license and niche evidence. */
export async function discoverBusinessVisuals(industry:string,fetcher:typeof fetch=fetch):Promise<VisualAsset[]>{
 const terms=nicheTerms(industry);if(!terms.length)return [];
 const query=terms.join(' '),key=query+(process.env.PEXELS_API_KEY?'|pexels':'');
 let state=providers.get(fetcher);if(!state){state={cache:new Map(),pending:new Map()};providers.set(fetcher,state)}
 const {cache,pending}=state,saved=cache.get(key);if(saved&&saved.until>Date.now())return structuredClone(saved.assets);
 const existing=pending.get(key);if(existing)return structuredClone(await existing);
 // Bound external requests without retaining an unbounded queue on the free tier.
 if(pending.size>=4)return [];
 const operation=research();pending.set(key,operation);
 try{return structuredClone(await operation)}finally{pending.delete(key)}
 async function research():Promise<VisualAsset[]>{
 const remember=(assets:VisualAsset[],ttl:number)=>{if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+ttl,assets});return assets};
 const photography=process.env.PEXELS_API_KEY?await discoverPexelsVisuals(industry,fetcher):[];
 if(photography.length>=4)return remember(photography,3600000);
 const url=new URL('https://commons.wikimedia.org/w/api.php');url.search=new URLSearchParams({action:'query',generator:'search',gsrnamespace:'6',gsrsearch:query+' filetype:bitmap -filetype:svg',gsrlimit:'10',prop:'imageinfo',iiprop:'url|size|extmetadata|mime',iiurlwidth:'3840',format:'json'}).toString();
 try{
  const response=await fetcher(url,{headers:{'User-Agent':'ForgeStudio/1.0 (business visual research; https://forge-studio-preview.stands-old-3h.workers.dev)','Accept':'application/json'},signal:AbortSignal.timeout(4500),redirect:'error'});
  if(!response.ok){await response.body?.cancel();return remember(photography,30000);}const raw=await readBoundedText(response);
  const data=JSON.parse(raw) as {query?:{pages?:Record<string,{title?:string;imageinfo?:{mime?:string;width?:number;height?:number;thumburl?:string;url?:string;descriptionurl?:string;extmetadata?:Record<string,{value?:string}>}[]}>}};
  const candidates=Object.values(data.query?.pages||{}).flatMap(page=>{const info=page.imageinfo?.[0],meta=info?.extmetadata;if(!info||!/^image\/(jpeg|png|webp)$/.test(info.mime||''))return [];const width=Number(info.width)||0,height=Number(info.height)||0;if(Math.max(width,height)<3840||Math.min(width,height)<2160)return [];return [{url:info.thumburl||info.url,title:(clean(page.title?.replace(/^File:/,''))+' '+clean(meta?.ImageDescription?.value)).trim().slice(0,350),credit:clean(meta?.Artist?.value).slice(0,250),source:info.descriptionurl,license:clean(meta?.LicenseShortName?.value)}]});
  return remember(relevantVisualAssets(industry,[...photography,...candidates]),3600000);
 }catch{return remember(photography,30000)}
 }
}

async function readBoundedText(response:Response){
 if(Number(response.headers.get('content-length'))>300000){await response.body?.cancel();throw Error('Visual metadata exceeds limit')}
 const reader=response.body?.getReader();if(!reader)throw Error('Visual metadata missing');
 const decoder=new TextDecoder();let bytes=0,text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>300000){await reader.cancel();throw Error('Visual metadata exceeds limit')}text+=decoder.decode(value,{stream:true})}return text+decoder.decode()}finally{reader.releaseLock()}
}

/** Optional free Pexels API. The key stays on the server; subject checks and credits are mandatory. */
export async function discoverPexelsVisuals(industry:string,fetcher:typeof fetch=fetch):Promise<VisualAsset[]>{
 const key=process.env.PEXELS_API_KEY;if(!key)return [];
 const terms=nicheTerms(industry);if(!terms.length)return [];
 const url=new URL('https://api.pexels.com/v1/search');url.search=new URLSearchParams({query:terms.join(' '),per_page:'10',orientation:'landscape',size:'large'}).toString();
 try{
  const response=await fetcher(url,{headers:{Authorization:key,Accept:'application/json'},signal:AbortSignal.timeout(4000),redirect:'error'});
  if(!response.ok){await response.body?.cancel();return []}
  const data=JSON.parse(await readBoundedText(response)) as {photos?:{width:number;height:number;alt:string;photographer:string;url:string;src?:{large2x?:string}}[]};
  if(!Array.isArray(data.photos))return [];
  return relevantVisualAssets(industry,data.photos.filter(photo=>photo.width>=1920&&photo.height>=1080).map(photo=>({url:photo.src?.large2x,title:clean(photo.alt).slice(0,350),credit:clean(photo.photographer).slice(0,250)+' on Pexels',source:photo.url,license:'Pexels License'})));
 }catch{return []}
}
