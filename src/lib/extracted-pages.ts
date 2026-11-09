import {objectNavigationMarkup} from '../../workers/object-navigation.mjs';
import {enhanceCinematicPages,objectNavigationPlan,type WebsiteExperience} from './website-experience';
import {escapeHtml as esc} from './export';
import type {GeneratedPage} from './business-site';
import type {SiteEvidence} from './forge-intelligence';

/** Allocate filenames once so navigation uses exactly the pages that will be emitted. */
export function createExtractedPages(evidence:SiteEvidence,businessName:string):GeneratedPage[]{
 const used=new Set(['index','services','about','contact']);
 const paths=new Set<string>();
 const entries=(evidence.pageSummaries||[]).flatMap(page=>{
  let path:string;
  try{const url=new URL(page.path,evidence.url);if(url.origin!==new URL(evidence.url).origin)return [];path=url.pathname.replace(/\/+$/,'')||'/'}catch{return []}
  if(paths.has(path))return [];paths.add(path);
  const base=path.split('/').filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,40);
  if(!base||['index','services','about','contact'].includes(base))return [];
  let slug=base;let suffix=2;while(used.has(slug))slug=base+'-'+suffix++;
  used.add(slug);return [{page,slug}];
 });
 return entries.map(({page,slug})=>{
  const title=esc(page.title||page.label);const summary=esc(page.description||'Content extracted from a public page; verify before publishing.');
  const navigation=entries.filter(item=>item.slug!==slug).map(item=>'<a href="'+item.slug+'.html">'+esc(item.page.label)+'</a>').join('');
  return {slug,title:page.label,html:'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' | '+esc(businessName)+'</title><meta name="description" content="'+summary+'"><style>body{margin:0;background:#151923;color:#f7f5ef;font:18px system-ui,sans-serif}nav{padding:25px 7%;display:flex;gap:24px;flex-wrap:wrap}a{color:#d9c7a4}main{max-width:900px;margin:10vh auto;padding:0 7%}h1{font-size:clamp(36px,7vw,80px)}p{line-height:1.7}li{margin:16px 0}</style></head><body><nav><a href="index.html">'+esc(businessName)+'</a><a href="services.html">Services</a><a href="about.html">About</a><a href="contact.html">Contact</a>'+navigation+'</nav><main><h1>'+title+'</h1><p>'+summary+'</p><ul>'+page.headings.slice(0,5).map(heading=>'<li>'+esc(heading)+'</li>').join('')+'</ul><p>Reconstructed content summary, not a copy of the original page or its functionality.</p></main></body></html>'};
 });
}

export function applyExtractedExperience(pages:GeneratedPage[],experience:WebsiteExperience,business:{industry:string;services:string[]}):GeneratedPage[]{
 if(experience==='cinematic')return enhanceCinematicPages(pages);
 const plan=experience==='object-navigation'?objectNavigationPlan(business):null;
 return plan?pages.map(page=>({...page,html:page.html.replace('<main>','<main>'+objectNavigationMarkup(plan))})):pages;
}
