/** Standalone safe static preview for browser-derived blueprints; no scripts or remote assets. */
const escapeHtml=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function blueprintToHtml(blueprint,selectedPage=0,localNavigation=false){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.sections))throw Error('Invalid blueprint');
 const observedPages=Array.isArray(blueprint.pages)?blueprint.pages.slice(0,12):[];
 const title=escapeHtml(String(observedPages[selectedPage]?.title||blueprint.title||'Untitled').slice(0,120));
 const headline=escapeHtml(String(blueprint.headline||blueprint.title||'Website').slice(0,180));
 const source=(()=>{try{const url=new URL(blueprint.sourceUrl);return url.protocol==='https:'&&!url.username&&!url.password?url:null}catch{return null}})();
 if(!Number.isInteger(selectedPage)||selectedPage<0||selectedPage>=Math.max(1,observedPages.length))throw Error('Invalid selected page');
 const currentPage=observedPages[selectedPage];
 const tokens=currentPage?.designTokens||{};
 const safeColor=v=>typeof v==='string'&&/^(?:#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\))$/i.test(v)?v:null;
 const safeFont=v=>typeof v==='string'&&/^[a-zA-Z0-9 ,"'_-]{1,160}$/.test(v)?v:null;
 const safeSize=v=>typeof v==='string'&&/^(?:[0-9]{1,3}(?:\.[0-9]{1,2})?px)$/.test(v)?v:null;
 const tokenStyle=':root{'+(safeColor(tokens.backgroundColor)?'--capture-bg:'+safeColor(tokens.backgroundColor)+';':'')+(safeColor(tokens.textColor)?'--capture-fg:'+safeColor(tokens.textColor)+';':'')+(safeFont(tokens.fontFamily)?'--capture-font:'+safeFont(tokens.fontFamily)+';':'')+(safeFont(tokens.headingFontFamily)?'--capture-heading-font:'+safeFont(tokens.headingFontFamily)+';':'')+(safeSize(tokens.baseFontSize)?'--capture-base-size:'+safeSize(tokens.baseFontSize)+';':'')+(safeSize(tokens.headingFontSize)?'--capture-heading-size:'+safeSize(tokens.headingFontSize)+';':'')+'}';
 const pageHeading=escapeHtml(String(currentPage?.title||blueprint.headline||blueprint.title||'Website').slice(0,180));
 const pageSections=currentPage&&Array.isArray(currentPage.regions)?currentPage.regions:blueprint.sections;
 const sections=pageSections.slice(0,100).map(section=>{
  const type=section?.type==='hero'?'hero':section?.type==='navigation'?'navigation':section?.type==='footer'?'footer':'content';
  const text=escapeHtml(String(section?.headline||'').slice(0,180));
  const b=section?.bounds;
  const valid=b&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0;
  const style=valid?' style="min-height:'+Math.min(560,Math.max(70,Math.round(b.height)))+'px"':'';
  return '<section class="region '+type+'"'+style+' aria-label="'+escapeHtml(type+' section')+'"><p>'+text+'</p></section>';
 }).join('\n');
 const localPaths=new Map(observedPages.map((p,index)=>[p?.path,index]));
 const currentPath=typeof currentPage?.path==='string'?currentPage.path:'/';
 const pageNavigation=Array.isArray(currentPage?.navigation)?currentPage.navigation:blueprint.navigation;
 const links=(Array.isArray(pageNavigation)?pageNavigation:[]).slice(0,30).filter(item=>item&&typeof item.label==='string'&&typeof item.target==='string').map(item=>{let target;try{target=source?new URL(item.target,new URL(currentPath,source)):null}catch{return ''}if(!target||target.protocol!=='https:'||target.origin!==source.origin||target.username||target.password)return '';const path=target.pathname;const pageIndex=localPaths.get(path)??localPaths.get(path.endsWith('/')?path.slice(0,-1):path+'/');const local=localNavigation&&Number.isInteger(pageIndex);const href=local?previewFileName(observedPages,pageIndex):target.href;return '<a href="'+escapeHtml(href)+'"'+(local?'':' rel="noopener noreferrer nofollow" target="_blank"')+'>'+escapeHtml(item.label.slice(0,100))+'</a>'}).filter(Boolean).join('');
 const pageList=observedPages.map((p,index)=>'<li>'+escapeHtml(String(p?.title||p?.path||'Page').slice(0,120))+(index===selectedPage?' (previewed)':'')+'</li>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>'+title+'</title><style>'+tokenStyle+'*,*::before,*::after{box-sizing:border-box}body{margin:0;background:var(--capture-bg,#f7f8fa);color:var(--capture-fg,#17212b);font:var(--capture-base-size,16px)/1.6 var(--capture-font,system-ui,sans-serif)}header,main,footer{max-width:1100px;margin:auto;padding:2rem}nav{display:flex;gap:1rem;flex-wrap:wrap}nav a{color:#2346a8}h1{font-family:var(--capture-heading-font,inherit);font-size:var(--capture-heading-size,clamp(2rem,5vw,4rem));line-height:1.15}.region{padding:2rem;margin:1rem 0;background:white;border:1px solid #e5e7eb;border-radius:1rem}.hero{padding:4rem 2rem;background:#e9efff}.region p{margin:0;overflow-wrap:anywhere}@media(hover:hover) and (prefers-reduced-motion:no-preference){.region{transform:perspective(1000px) translateZ(0);transition:transform .22s ease,box-shadow .22s ease}.region:hover{transform:perspective(1000px) translateZ(12px);box-shadow:0 14px 30px #17212b22}}@media(prefers-reduced-motion:reduce){.region{transition:none!important;transform:none!important}}@media(max-width:650px){header,main,footer{padding:1rem}.region{padding:1.25rem}}</style></head><body><header><p>Editable reconstruction preview — not verified original content</p><nav aria-label="Observed navigation">'+links+'</nav><h1>'+headline+'</h1>'+(pageList?'<details><summary>Captured pages ('+observedPages.length+')</summary><ul>'+pageList+'</ul></details>':'')+'</header><main>'+sections+'</main><footer><small>Review source rights, links and accessibility before publishing.</small></footer></body></html>';
}

function previewFileName(pages,index){
 const slugFor=page=>{
  const path=typeof page?.path==='string'?page.path:'/';
  const parts=path.split('/').filter(Boolean).map(part=>part.replace(/[^a-zA-Z0-9_-]/g,'-'));
  return (parts.join('-')||'index').slice(0,80);
 };
 const slug=slugFor(pages[index]);
 let collisions=0;
 for(let i=0;i<index;i++)if(slugFor(pages[i])===slug)collisions++;
 return slug+(collisions?'-'+(index+1):'')+'.html';
}
/** Export a bounded multi-page, self-contained preview package; no live network calls. */
export function blueprintToPages(blueprint){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.sections))throw Error('Invalid blueprint');
 const pages=Array.isArray(blueprint.pages)&&blueprint.pages.length?blueprint.pages.slice(0,12):[null];
 return pages.map((page,index)=>({filename:previewFileName(pages,index),title:typeof page?.title==='string'?page.title:blueprint.title||'Website',html:blueprintToHtml(blueprint,index,true)});
}
