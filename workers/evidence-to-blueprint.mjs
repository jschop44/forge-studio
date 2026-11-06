/** Deterministic, untrusted browser-evidence -> editable website blueprint adapter. */
const clean=(value,max=240)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const allowedRoles=new Set(['hero','header','nav','main','section','footer']);
export function evidenceToBlueprint(evidence){
 if(!evidence||evidence.version!==1||!Array.isArray(evidence.pages)||!evidence.pages.length)throw Error('Unsupported browser evidence');
 const source=new URL(evidence.sourceUrl);
 if(source.protocol!=='https:'||source.username||source.password)throw Error('Invalid evidence source');
 const page=evidence.pages[0];
 if(!page||!Array.isArray(page.visualRegions))throw Error('Missing visual regions');
 const regions=page.visualRegions.slice(0,100).filter(r=>r&&allowedRoles.has(r.role)&&[r.x,r.y,r.width,r.height].every(n=>Number.isFinite(n)&&n>=0)&&r.width>0&&r.height>0).map((r,i)=>({
  id:'region-'+(i+1),type:r.role==='hero'?'hero':r.role==='nav'?'navigation':r.role==='footer'?'footer':'content',
  sourceRole:r.role,headline:clean(r.text,180),bounds:{x:r.x,y:r.y,width:r.width,height:r.height}
 }));
 const title=clean(page.title,120)||source.hostname;
 const headings=(Array.isArray(page.landmarks)?page.landmarks:[]).filter(l=>l&&l.role==='h1').map(l=>clean(l.text,180)).filter(Boolean);
 return {version:1,sourceUrl:source.origin,title,headline:headings[0]||title,sections:regions,
  navigation:(Array.isArray(page.interactions)?page.interactions:[]).filter(i=>i?.kind==='link').slice(0,30).map(i=>({label:clean(i.label,100),target:clean(i.target,300),verified:false})),
  provenance:{capturedAt:clean(evidence.capturedAt,40),mode:'observed-only',generatedContent:false},
  warnings:['Source observations only: verify rights, content, functionality and accessibility before publishing.']};
}
