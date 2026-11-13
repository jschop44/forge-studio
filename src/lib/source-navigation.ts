/** Choose a bounded, representative set of publicly discoverable pages rather
 * than spending every source-inspection slot on the first mega-menu category.
 * This is selection only: network policy and fetch budgets are unchanged.
 */
export type SourceNavigationLink={label:string;path:string};
type PageKind='catalog'|'experiences'|'company'|'support'|'other';

function pageKind(item:SourceNavigationLink):PageKind{
 const text=(item.label+' '+item.path.replace(/[\/_-]+/g,' ')).toLowerCase();
 if(/\b(?:products?|shop|shopping|catalog|collections?|categories|departments?|equipment|electronics|appliances|merchandise|storefront)\b/.test(text))return 'catalog';
 if(/\b(?:services?|experiences?|destinations?|parks?|resorts?|movies?|films?|shows?|tickets?|events?|attractions?|streaming|activities)\b/.test(text))return 'experiences';
 if(/\b(?:about|company|our story|who we are|mission|history|leadership)\b/.test(text))return 'company';
 if(/\b(?:contact|support|help|locations?|find a store|store locator|visit us|faq|how it works)\b/.test(text))return 'support';
 return 'other';
}
function depth(path:string):number{
 try{return new URL(path,'https://source.example/').pathname.split('/').filter(Boolean).length}catch{return 100}
}
function canonicalSection(path:string):number{
 return /^\/(?:products?|shop|catalog|collections?|categories|departments?|services?|experiences?|about|contact|support|help|locations|parks|movies|destinations)\/?$/i.test(path)?0:1;
}
/** Prioritize one page from each observed area; fill remaining slots in source order. */
export function selectRepresentativeSourcePages<T extends SourceNavigationLink>(links:readonly T[],limit=4):T[]{
 const safeLimit=Math.max(0,Math.min(30,Math.floor(Number.isFinite(limit)?limit:0)));
 if(!safeLimit)return [];
 const eligible=links.filter(link=>link&&typeof link.label==='string'&&typeof link.path==='string'&&link.path.startsWith('/')&&!link.path.startsWith('//')&&link.path.length<=140);
 const unique=eligible.filter((item,index)=>eligible.findIndex(other=>other.path===item.path)===index);
 const selected:T[]=[];const used=new Set<string>();
 for(const group of ['catalog','experiences','company','support'] as const){
  const options=unique.map((item,index)=>({item,index})).filter(x=>pageKind(x.item)===group&&!used.has(x.item.path));
  options.sort((a,b)=>canonicalSection(a.item.path)-canonicalSection(b.item.path)||depth(a.item.path)-depth(b.item.path)||a.index-b.index);
  if(options.length){selected.push(options[0].item);used.add(options[0].item.path)}
  if(selected.length>=safeLimit)return selected;
 }
 for(const item of unique){
  if(selected.length>=safeLimit)break;
  if(!used.has(item.path)){selected.push(item);used.add(item.path)}
 }
 return selected;
}
