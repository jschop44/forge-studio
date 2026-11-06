/** Standalone safe static preview for browser-derived blueprints; no scripts or remote assets. */
const escapeHtml=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function blueprintToHtml(blueprint,selectedPage=0){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.sections))throw Error('Invalid blueprint');
 const title=escapeHtml(String(blueprint.title||'Untitled').slice(0,120));
 const headline=escapeHtml(String(blueprint.headline||blueprint.title||'Website').slice(0,180));
 const source=(()=>{try{const url=new URL(blueprint.sourceUrl);return url.protocol==='https:'&&!url.username&&!url.password?url:null}catch{return null}})();
 const observedPages=Array.isArray(blueprint.pages)?blueprint.pages.slice(0,12):[];
 if(!Number.isInteger(selectedPage)||selectedPage<0||selectedPage>=Math.max(1,observedPages.length))throw Error('Invalid selected page');
 const currentPage=observedPages[selectedPage];
 const pageSections=currentPage&&Array.isArray(currentPage.regions)?currentPage.regions:blueprint.sections;
 const sections=pageSections.slice(0,100).map(section=>{
  const type=section?.type==='hero'?'hero':section?.type==='navigation'?'navigation':section?.type==='footer'?'footer':'content';
  const text=escapeHtml(String(section?.headline||'').slice(0,180));
  const b=section?.bounds;
  const valid=b&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0;
  const style=valid?' style="min-height:'+Math.min(560,Math.max(70,Math.round(b.height)))+'px"':'';
  return '<section class="region '+type+'"'+style+' aria-label="'+escapeHtml(type+' section')+'"><p>'+text+'</p></section>';
 }).join('\n');
 const links=(Array.isArray(blueprint.navigation)?blueprint.navigation:[]).slice(0,30).filter(item=>item&&typeof item.label==='string'&&typeof item.target==='string').map(item=>{let target;try{target=source?new URL(item.target,source):null}catch{return ''}if(!target||target.protocol!=='https:'||target.origin!==source.origin||target.username||target.password)return '';return '<a href="'+escapeHtml(target.href)+'" rel="noopener noreferrer nofollow" target="_blank">'+escapeHtml(item.label.slice(0,100))+'</a>'}).filter(Boolean).join('');
 const pageList=observedPages.map((p,index)=>'<li>'+escapeHtml(String(p?.title||p?.path||'Page').slice(0,120))+(index===selectedPage?' (previewed)':'')+'</li>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>'+title+'</title><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#17212b;font:16px/1.6 system-ui,sans-serif}header,main,footer{max-width:1100px;margin:auto;padding:2rem}nav{display:flex;gap:1rem;flex-wrap:wrap}nav a{color:#2346a8}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.15}.region{padding:2rem;margin:1rem 0;background:white;border:1px solid #e5e7eb;border-radius:1rem}.hero{padding:4rem 2rem;background:#e9efff}.region p{margin:0;overflow-wrap:anywhere}</style></head><body><header><p>Editable reconstruction preview — not verified original content</p><nav aria-label="Observed navigation">'+links+'</nav><h1>'+headline+'</h1>'+(pageList?'<details><summary>Captured pages ('+observedPages.length+')</summary><ul>'+pageList+'</ul></details>':'')+'</header><main>'+sections+'</main><footer><small>Review source rights, links and accessibility before publishing.</small></footer></body></html>';
}
