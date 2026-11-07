/** Standalone safe static preview for browser-derived blueprints; no scripts or remote assets. */
const escapeHtml=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function blueprintToHtml(blueprint,selectedPage=0,localNavigation=false){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.sections))throw Error('Invalid blueprint');
 const observedPages=Array.isArray(blueprint.pages)?blueprint.pages.slice(0,12):[];
 if(!Number.isInteger(selectedPage)||selectedPage<0||selectedPage>=Math.max(1,observedPages.length))throw Error('Invalid selected page');
 const title=escapeHtml(String(observedPages[selectedPage]?.title||blueprint.title||'Untitled').slice(0,120));
 const headline=escapeHtml(String(blueprint.headline||blueprint.title||'Website').slice(0,180));
 const source=(()=>{try{const url=new URL(blueprint.sourceUrl);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port?url:null}catch{return null}})();
 const currentPage=observedPages[selectedPage];
 const tokens=currentPage?.designTokens||{};
 const safeColor=v=>typeof v==='string'&&/^(?:#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\))$/i.test(v)?v:null;
 const safeFont=v=>typeof v==='string'&&/^[a-zA-Z0-9 ,"'_-]{1,160}$/.test(v)?v:null;
 const safeSize=v=>typeof v==='string'&&/^(?:[0-9]{1,3}(?:\.[0-9]{1,2})?px)$/.test(v)?v:null;
 const tokenStyle=':root{'+(safeColor(tokens.backgroundColor)?'--capture-bg:'+safeColor(tokens.backgroundColor)+';':'')+(safeColor(tokens.textColor)?'--capture-fg:'+safeColor(tokens.textColor)+';':'')+(safeFont(tokens.fontFamily)?'--capture-font:'+safeFont(tokens.fontFamily)+';':'')+(safeFont(tokens.headingFontFamily)?'--capture-heading-font:'+safeFont(tokens.headingFontFamily)+';':'')+(safeSize(tokens.baseFontSize)?'--capture-base-size:'+safeSize(tokens.baseFontSize)+';':'')+(safeSize(tokens.headingFontSize)?'--capture-heading-size:'+safeSize(tokens.headingFontSize)+';':'')+'}';
 const pageHeading=escapeHtml(String(currentPage?.title||blueprint.headline||blueprint.title||'Website').slice(0,180));
 const pageSections=currentPage&&Array.isArray(currentPage.regions)?currentPage.regions:blueprint.sections;
 const maxRight=Math.max(1,...pageSections.filter(s=>s?.bounds&&Number.isFinite(s.bounds.x)&&Number.isFinite(s.bounds.width)).map(s=>s.bounds.x+s.bounds.width));
 const measured=pageSections.filter(s=>s?.bounds&&[s.bounds.x,s.bounds.y,s.bounds.width,s.bounds.height].every(Number.isFinite)&&s.bounds.x>=0&&s.bounds.y>=0&&s.bounds.width>0&&s.bounds.height>0);
 const positioned=measured.length>0;
 const topY=measured.length?Math.min(...measured.map(s=>s.bounds.y)):0;
 const canvasHeight=measured.length?Math.min(12000,Math.max(200,...measured.map(s=>s.bounds.y+s.bounds.height-topY))):0;
 const sections=pageSections.slice(0,100).map(section=>{
  const type=section?.type==='hero'?'hero':section?.type==='navigation'?'navigation':section?.type==='footer'?'footer':'content';
  const text=escapeHtml(String(section?.headline||'').slice(0,180));
  const b=section?.bounds;
  const valid=b&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0;
  const width=valid?Math.max(15,Math.min(100,Math.round(b.width/maxRight*100))):100;
  const left=valid?Math.max(0,Math.min(100-width,Math.round(b.x/maxRight*100))):0;
  const style=valid?' style="position:absolute;top:'+Math.max(0,Math.round(b.y-topY))+'px;left:'+left+'%;width:'+width+'%;min-height:'+Math.min(1200,Math.max(30,Math.round(b.height)))+'px"':'';
  return '<section class="region '+type+'"'+style+' aria-label="'+escapeHtml(type+' section')+'"><p>'+text+'</p></section>';
 }).join('\n');
 const localPaths=new Map();
 observedPages.forEach((p,index)=>{if(typeof p?.path==='string'&&!localPaths.has(p.path))localPaths.set(p.path,index)});
 const previewNames=previewFileNames(observedPages);
 const currentPath=typeof currentPage?.path==='string'?currentPage.path:'/';
 const pageNavigation=Array.isArray(currentPage?.navigation)&&currentPage.navigation.length?currentPage.navigation:blueprint.navigation;
 const links=(Array.isArray(pageNavigation)?pageNavigation:[]).slice(0,30).filter(item=>item&&typeof item.label==='string'&&typeof item.target==='string').map(item=>{let target;try{target=source?new URL(item.target,new URL(currentPath,source)):null}catch{return ''}if(!target||target.protocol!=='https:'||target.origin!==source.origin||target.username||target.password||target.port)return '';const path=target.pathname+target.search;const pageIndex=localPaths.get(path)??(target.search?undefined:localPaths.get(path.endsWith('/')?path.slice(0,-1):path+'/'));const local=localNavigation&&Number.isInteger(pageIndex);const href=local?previewNames[pageIndex]:target.href;return '<a href="'+escapeHtml(href)+'"'+(local?'':' rel="noopener noreferrer nofollow" target="_blank"')+'>'+escapeHtml(item.label.slice(0,100))+'</a>'}).filter(Boolean).join('');
 const pageList=observedPages.map((p,index)=>'<li>'+(localNavigation?'<a href="'+escapeHtml(previewNames[index])+'"'+(index===selectedPage?' aria-current="page"':'')+'>':'')+escapeHtml(String(p?.title||p?.path||'Page').slice(0,120))+(localNavigation?'</a>':'')+(index===selectedPage?' (previewed)':'')+'</li>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>'+title+'</title><style>'+tokenStyle+'*,*::before,*::after{box-sizing:border-box}body{margin:0;background:var(--capture-bg,#f7f8fa);color:var(--capture-fg,#17212b);font:var(--capture-base-size,16px)/1.6 var(--capture-font,system-ui,sans-serif)}header,main,footer{max-width:1100px;margin:auto;padding:2rem}nav{display:flex;gap:1rem;flex-wrap:wrap}nav a{color:#2346a8}.capture-layout{position:relative;max-width:1100px}h1{font-family:var(--capture-heading-font,inherit);font-size:var(--capture-heading-size,clamp(2rem,5vw,4rem));line-height:1.15}.region{padding:clamp(1rem,2vw,2rem);margin:0;background:transparent;border:0;border-radius:0;max-width:100%;overflow:hidden}.hero{display:flex;align-items:center;padding:clamp(2rem,5vw,5rem);background:color-mix(in srgb,var(--capture-bg,#f7f8fa) 80%,#aabde8);font-family:var(--capture-heading-font,inherit);font-size:clamp(1.8rem,4vw,3.7rem);font-weight:700;line-height:1.13;letter-spacing:-.035em}.navigation{font-size:.9rem;font-weight:600}.footer{font-size:.85rem;opacity:.78}.region p{margin:0;overflow-wrap:anywhere}@media(hover:hover) and (prefers-reduced-motion:no-preference){.region{transform:perspective(1000px) translateZ(0);transition:transform .22s ease,box-shadow .22s ease}.region:hover{transform:perspective(1000px) translateZ(12px);box-shadow:0 14px 30px #17212b22}}@media(prefers-reduced-motion:reduce){.region{transition:none!important;transform:none!important}}@media(max-width:900px){.capture-layout{min-height:0!important}.capture-layout .region{position:relative!important;top:auto!important;left:auto!important;width:100%!important;margin-left:0!important;min-height:0!important}}@media(max-width:650px){header,main,footer{padding:1rem}.capture-layout{min-height:0!important}.capture-layout .region{position:relative!important;top:auto!important;left:auto!important}.region{padding:1.25rem;width:100%!important;margin-left:0!important;min-height:0!important}}</style></head><body><header><p>Editable reconstruction preview — not verified original content</p><nav aria-label="Observed navigation">'+links+'</nav><h1>'+pageHeading+'</h1>'+(pageList?'<details><summary>Captured pages ('+observedPages.length+')</summary><ul>'+pageList+'</ul></details>':'')+'</header><main'+(positioned?' class="capture-layout" style="min-height:'+canvasHeight+'px"':'')+'>'+sections+'</main><footer><small>Review source rights, links and accessibility before publishing.</small></footer></body></html>';
}

function previewFileNames(pages){
 const seen=new Set();
 return pages.map(page=>{
  const raw=typeof page?.path==='string'?page.path:'/';
  let url;
  try{url=new URL(raw,'https://preview.invalid')}catch{url=new URL('https://preview.invalid/')}
  const pathParts=url.pathname.split('/').filter(Boolean).map(part=>part.replace(/[^a-zA-Z0-9_-]/g,'-'));
  const query=url.search?'-'+url.search.slice(1).replace(/[^a-zA-Z0-9_-]/g,'-'):'';
  const slug=((pathParts.join('-')||'index')+query).slice(0,75)||'index';
  let filename=slug+'.html';
  for(let suffix=2;seen.has(filename);suffix++)filename=slug+'-'+suffix+'.html';
  seen.add(filename);
  return filename;
 });
}
/** Export a bounded multi-page, self-contained preview package; no live network calls. */
export function blueprintToPages(blueprint){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.sections))throw Error('Invalid blueprint');
 const pages=Array.isArray(blueprint.pages)&&blueprint.pages.length?blueprint.pages.slice(0,12):[null];
 const filenames=previewFileNames(pages);
 return pages.map((page,index)=>({filename:filenames[index],title:typeof page?.title==='string'?page.title:blueprint.title||'Website',html:blueprintToHtml(blueprint,index,true)}));
}
