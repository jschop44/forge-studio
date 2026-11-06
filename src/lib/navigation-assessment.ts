/** Classifies discovered hrefs without visiting them or executing page scripts. */
export type NavigationCandidate={label:string;target:string};
export type NavigationAssessment={label:string;path:string;status:'internal'|'external'|'fragment'|'unsafe'|'invalid'};
export function assessNavigationTargets(sourceUrl:string,items:NavigationCandidate[]):NavigationAssessment[]{
 const source=new URL(sourceUrl);
 if(source.protocol!=='https:'||source.username||source.password)throw Error('HTTPS source required');
 return items.slice(0,80).map(item=>{
  const raw=item.target.trim();
  if(!raw)return {label:item.label,path:'',status:'invalid' as const};
  if(raw.startsWith('#'))return {label:item.label,path:raw,status:'fragment' as const};
  if(/^(?:javascript|data|vbscript|file|blob):/i.test(raw))return {label:item.label,path:'',status:'unsafe' as const};
  try{
   const url=new URL(raw,source);
   if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return {label:item.label,path:'',status:'unsafe' as const};
   if(url.origin!==source.origin)return {label:item.label,path:url.origin,status:'external' as const};
   return {label:item.label,path:url.pathname+url.search+url.hash,status:'internal' as const};
  }catch{return {label:item.label,path:'',status:'invalid' as const};}
 });
}
