import type {GeneratedPage} from './business-site';
import type {SiteEvidence} from './forge-intelligence';
import {escapeHtml} from './export';
import {publicSourceAsset} from './website-design-dna';

type Summary=NonNullable<SiteEvidence['pageSummaries']>[number];
/** Only exact, explicitly inspected default routes; do not infer aliases from labels. */
export function defaultSourcePages(evidence:SiteEvidence|null|undefined):Array<{slug:string;source:string;summary:Summary}>{
 if(!evidence)return [];
 let root:URL;try{root=new URL(evidence.url);if(!publicSourceAsset(root.href,root.href))return []}catch{return []}
 const candidates=new Map<string,Map<string,Summary>>();
 for(const summary of (evidence.pageSummaries||[]).slice(0,12)){
  try{
   const url=new URL(summary.path,root);
   if(url.origin!==root.origin||url.username||url.password)continue;
   const slug=url.pathname.replace(/\/+$/,'').slice(1);
   if(!['about','services','contact'].includes(slug))continue;
   url.hash='';
   const entries=candidates.get(slug)||new Map<string,Summary>();
   if(!entries.has(url.href))entries.set(url.href,summary);
   candidates.set(slug,entries);
  }catch{}
 }
 return [...candidates].flatMap(([slug,entries])=>entries.size===1?[{slug,source:[...entries.keys()][0],summary:[...entries.values()][0]}]:[]);
}
/** Retain observed text only. Never import source markup, forms, scripts or behaviors. */
export function applyDefaultSourceContent(pages:GeneratedPage[],evidence:SiteEvidence|null|undefined,mode:string):{pages:GeneratedPage[];warnings:string[]}{
 if(!['preserve','inspired','redesign'].includes(mode))return {pages,warnings:[]};
 const sources=defaultSourcePages(evidence);let applied=0;
 const output=pages.map(page=>{
  const source=sources.find(item=>item.slug===page.slug);
  if(!source||!/<\/main>/i.test(page.html))return page;
  const html=page.html.replace(/<section data-forge-source-copy="[a-z]+"[^>]*>[\s\S]*?<\/section>/g,'');
  const seen=new Set<string>();
  const paragraphs=(source.summary.paragraphs?.length?source.summary.paragraphs:[source.summary.description]).slice(0,24).flatMap(value=>{
   if(typeof value!=='string')return [];
   const text=value.trim().replace(/\s+/g,' ').slice(0,1200);
   if(!text||seen.has(text.toLowerCase()))return [];
   seen.add(text.toLowerCase());
   const escaped=escapeHtml(text);
   return html.includes('>'+escaped+'<')?[]:[escaped];
  }).slice(0,12);
  if(!paragraphs.length)return html===page.html?page:{...page,html};
  const label=escapeHtml(page.title+' details');
  const section='<section data-forge-source-copy="'+page.slug+'" style="margin-block:3rem;max-width:72ch"><h2>'+label+'</h2>'+paragraphs.map(text=>'<p>'+text+'</p>').join('')+'<p><a href="'+escapeHtml(source.source)+'" target="_blank" rel="noopener noreferrer">View original page</a></p></section>';
  applied++;
  return {...page,html:html.replace(/<\/main>/i,section+'</main>')};
 });
 return {pages:output,warnings:applied?['Observed text from matching source pages was retained. Review its accuracy and authorization before publishing.']:[]};
}
