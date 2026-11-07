/** Deterministic, untrusted browser-evidence -> editable website blueprint adapter. */
const clean=(value,max=240)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const allowedRoles=new Set(['hero','header','nav','main','section','footer']);
const safeColor=value=>typeof value==='string'&&/^(?:#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\))$/i.test(value.trim())?value.trim().slice(0,64):undefined;
const safeFont=value=>typeof value==='string'&&/^[a-zA-Z0-9 ,\"'_-]{1,160}$/.test(value)?value:undefined;
const safeSize=value=>typeof value==='string'&&/^(?:[0-9]{1,3}(?:\.[0-9]{1,2})?px)$/.test(value)?value:undefined;
const designTokens=page=>({backgroundColor:safeColor(page?.designTokens?.backgroundColor),textColor:safeColor(page?.designTokens?.textColor),fontFamily:safeFont(page?.designTokens?.fontFamily),headingFontFamily:safeFont(page?.designTokens?.headingFontFamily),headingFontSize:safeSize(page?.designTokens?.headingFontSize),baseFontSize:safeSize(page?.designTokens?.baseFontSize)});
const observedLinks=(page,source)=>{const base=new URL(typeof page.path==='string'&&page.path.startsWith('/')&&!page.path.startsWith('//')?page.path:'/',source);if(base.origin!==source.origin)return [];return (Array.isArray(page.interactions)?page.interactions:[]).filter(i=>i?.kind==='link').slice(0,30).flatMap(i=>{try{if(typeof i.target!=='string'||!i.target.trim())return [];const target=new URL(i.target,base);if(target.protocol!=='https:'||target.origin!==source.origin||target.username||target.password)return [];return [{label:clean(i.label,100),target:target.href,verified:false}]}catch{return []}})};
export function evidenceToBlueprint(evidence){
 if(!evidence||evidence.version!==1||!Array.isArray(evidence.pages)||!evidence.pages.length)throw Error('Unsupported browser evidence');
 let source;try{source=new URL(evidence.sourceUrl)}catch{throw Error('Invalid evidence source')}
 if(source.protocol!=='https:'||source.username||source.password||source.port&&source.port!=='443'||source.hostname==='localhost'||source.hostname.endsWith('.local')||source.hostname.endsWith('.internal')||source.hostname.endsWith('.test')||/^\d+(?:\.\d+){3}$/.test(source.hostname))throw Error('Invalid evidence source');
 const page=evidence.pages[0];
 if(!page||!Array.isArray(page.visualRegions))throw Error('Missing visual regions');
 const regions=page.visualRegions.slice(0,100).filter(r=>r&&allowedRoles.has(r.role)&&[r.x,r.y,r.width,r.height].every(n=>Number.isFinite(n)&&n>=0)&&r.width>0&&r.height>0).map((r,i)=>({
  id:'region-'+(i+1),type:r.role==='hero'?'hero':r.role==='nav'?'navigation':r.role==='footer'?'footer':'content',
  sourceRole:r.role,headline:clean(r.text,180),bounds:{x:r.x,y:r.y,width:r.width,height:r.height}
 }));
 const title=clean(page.title,120)||source.hostname;
 const headings=(Array.isArray(page.landmarks)?page.landmarks:[]).filter(l=>l&&l.role==='h1').map(l=>clean(l.text,180)).filter(Boolean);
 const pages=evidence.pages.slice(0,12).map((p,index)=>({id:'page-'+(index+1),path:typeof p.path==='string'&&p.path.startsWith('/')&&!p.path.startsWith('//')?p.path:'/',title:clean(p.title,120)||'Untitled page',designTokens:designTokens(p),navigation:observedLinks(p,source),regions:(Array.isArray(p.visualRegions)?p.visualRegions:[]).slice(0,100).filter(r=>r&&allowedRoles.has(r.role)&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0&&r.x>=0&&r.y>=0).map((r,i)=>({id:'region-'+(i+1),type:r.role,headline:clean(r.text,180),bounds:{x:r.x,y:r.y,width:r.width,height:r.height}}))}));
 const navigationChecks=evidence.pages.slice(0,12).flatMap(p=>(Array.isArray(p.navigationChecks)?p.navigationChecks:[]).slice(0,8)).map(check=>({path:clean(check.path,500),status:Number.isInteger(check.status)?check.status:null,ok:check.ok===true,verifiedBy:'navigation-get'}));
 const interactions=evidence.pages.reduce((acc,p)=>{for(const i of Array.isArray(p.interactions)?p.interactions:[]){if(i?.kind==='link')acc.links++;if(i?.kind==='button')acc.buttons++;if(i?.kind==='form')acc.forms++;if(i?.verified===true)acc.verified++;}return acc},{links:0,buttons:0,forms:0,verified:0});
 return {version:1,sourceUrl:source.origin,title,headline:headings[0]||title,sections:regions,pages,interactionCoverage:{...interactions,executed:false},navigationChecks,
  navigation:observedLinks(page,source),
  provenance:{capturedAt:clean(evidence.capturedAt,40),mode:'observed-only',generatedContent:false},
  warnings:['Source observations only: verify rights, content, functionality and accessibility before publishing.']};
}
