import {validateBrowserEvidence,type BrowserEvidence} from './browser-evidence';
import type {GeneratedPage} from './business-site';
import {escapeHtml} from './export';

/** Review-only visual layout preview, never a verified replica or publish-ready draft. */
export function capturePreviewPages(input:unknown):GeneratedPage[]{
 if(!validateBrowserEvidence(input))throw Error('Invalid browser evidence');
 const evidence:BrowserEvidence=input;
 const page=evidence.pages[0];
 if(!page)throw Error('Capture has no pages');
 const title=escapeHtml(page.title||'Captured website');
 const sections=(page.visualRegions||[]).slice(0,80).map(region=>{
  const role=region.role==='hero'?'hero':region.role==='footer'?'footer':region.role==='nav'?'navigation':'content';
  return '<section class="region '+role+'"><p>'+escapeHtml((region.text||'').slice(0,200))+'</p></section>';
 }).join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';style-src \'unsafe-inline\';base-uri \'none\';form-action \'none\'"><title>'+title+'</title><style>*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,sans-serif;color:#17212b;background:#f7f8fa}header,main,footer{max-width:1100px;margin:auto;padding:2rem}.region{background:#fff;padding:2rem;margin:1rem 0;border:1px solid #ddd;border-radius:1rem}.hero{background:#e9efff;padding:4rem 2rem}p{overflow-wrap:anywhere}</style></head><body><header><h1>'+title+'</h1><p>Observed layout preview. Not a verified replica; review before publishing.</p></header><main>'+sections+'</main><footer>Source: '+escapeHtml(evidence.sourceUrl)+'</footer></body></html>';
 return [{slug:'index',title:'Captured layout preview',html}];
}
