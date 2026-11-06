import {validateBrowserEvidence,type BrowserEvidence} from './browser-evidence';
import type {GeneratedPage} from './business-site';
import {escapeHtml} from './export';

/** Review-only visual layout preview, never a verified replica or publish-ready draft. */
export function capturePreviewPages(input:unknown):GeneratedPage[]{
 if(!validateBrowserEvidence(input))throw Error('Invalid browser evidence');
 const evidence:BrowserEvidence=input;
 if(!evidence.pages.length)throw Error('Capture has no pages');
 return evidence.pages.map((page,index)=>{
 const title=escapeHtml(page.title||'Captured website');
 const sections=[...(page.visualRegions||[])].sort((a,b)=>a.y-b.y||a.x-b.x).slice(0,80).map(region=>{
  const role=region.role==='hero'?'hero':region.role==='footer'?'footer':region.role==='nav'?'navigation':'content';
  const height=Math.min(560,Math.max(70,Math.round(region.height)));
  const width=Math.min(100,Math.max(15,Math.round(region.width/evidence.viewport.width*100)));
  const left=Math.min(100-width,Math.max(0,Math.round(region.x/evidence.viewport.width*100)));
  return '<section class="region '+role+'" style="min-height:'+height+'px;width:'+width+'%;margin-left:'+left+'%"><p>'+escapeHtml((region.text||'').slice(0,200))+'</p></section>';
 }).join('');
 const observedLinks=page.interactions.filter(item=>item.kind==='link'&&item.target&&item.label).slice(0,30).flatMap(item=>{try{const source=new URL(evidence.sourceUrl);const pageBase=new URL(page.path,source);const url=new URL(item.target!,pageBase);if(url.protocol!=='https:'||url.origin!==source.origin||url.username||url.password)return [];return ['<a href="'+escapeHtml(url.href)+'" target="_blank" rel="noopener noreferrer nofollow">'+escapeHtml(item.label.slice(0,100))+'</a>']}catch{return []}}).join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';style-src \'unsafe-inline\';base-uri \'none\';form-action \'none\'"><title>'+title+'</title><style>*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,sans-serif;color:#17212b;background:#f7f8fa}header,main,footer{max-width:1100px;margin:auto;padding:2rem}.region{background:#fff;padding:2rem;margin:1rem 0;border:1px solid #ddd;border-radius:1rem}.hero{background:#e9efff;padding:4rem 2rem}p{overflow-wrap:anywhere}nav{display:flex;gap:1rem;flex-wrap:wrap}nav a{color:#2346a8}@media(max-width:650px){.region{width:100%!important;margin-left:0!important;min-height:70px!important}}</style></head><body><header><h1>'+title+'</h1><nav aria-label="Observed navigation">'+observedLinks+'</nav><p>Observed layout preview. Not a verified replica; review before publishing.</p></header><main>'+sections+'</main><footer>Source: '+escapeHtml(evidence.sourceUrl)+'</footer></body></html>';
 return {slug:index===0?'index':'capture-'+(index+1),title:(page.title||'Captured page').slice(0,100),html};
 });
}
