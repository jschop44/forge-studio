/** Conservative exclusions for automatic source-site GET navigation probes. */
const riskySegments=new Set(['logout','log-out','signout','sign-out','delete','remove','destroy','unsubscribe','cancel','checkout','purchase','buy','order','pay','payment','confirm','approve','reject','reset','disable','enable','activate','deactivate','update','edit','submit','send','download','export','import','install','uninstall','revoke','invite','join']);
const riskyParameters=new Set(['action','do','command','cmd','operation','op','token','key','code','auth','session','logout','delete','remove','unsubscribe','confirm','purchase','checkout','payment','redirect']);
export function isSafeNavigationProbe(raw,origin){
 let url,base;
 try{base=new URL(origin);url=new URL(raw,base);}catch{return false;}
 if(url.protocol!=='https:'||url.origin!==base.origin||url.username||url.password||url.hash&&url.pathname===base.pathname&&url.search===base.search)return false;
 let segments;
 try{segments=decodeURIComponent(url.pathname).toLowerCase().split(/[\\/._-]+/).filter(Boolean);}catch{return false;}
 if(segments.some(segment=>riskySegments.has(segment)))return false;
 for(const key of url.searchParams.keys())if(riskyParameters.has(key.toLowerCase()))return false;
 return true;
}
