/** Standalone safe static preview for browser-derived blueprints; no scripts or remote assets. */
const escapeHtml=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function blueprintToHtml(blueprint){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.sections))throw Error('Invalid blueprint');
 const title=escapeHtml(String(blueprint.title||'Untitled').slice(0,120));
 const headline=escapeHtml(String(blueprint.headline||blueprint.title||'Website').slice(0,180));
 const sections=blueprint.sections.slice(0,100).map(section=>{
  const type=section?.type==='hero'?'hero':section?.type==='navigation'?'navigation':section?.type==='footer'?'footer':'content';
  const text=escapeHtml(String(section?.headline||'').slice(0,180));
  return '<section class="region '+type+'"><p>'+text+'</p></section>';
 }).join('\n');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>'+title+'</title><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#17212b;font:16px/1.6 system-ui,sans-serif}header,main,footer{max-width:1100px;margin:auto;padding:2rem}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.15}.region{padding:2rem;margin:1rem 0;background:white;border:1px solid #e5e7eb;border-radius:1rem}.hero{padding:4rem 2rem;background:#e9efff}.region p{margin:0;overflow-wrap:anywhere}</style></head><body><header><p>Editable reconstruction preview — not verified original content</p><h1>'+headline+'</h1></header><main>'+sections+'</main><footer><small>Review source rights, links and accessibility before publishing.</small></footer></body></html>';
}
