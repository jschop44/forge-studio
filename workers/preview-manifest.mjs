import {createHash} from 'node:crypto';
/** Deterministic static-preview export manifest. Never claims source-site ownership. */
import {blueprintToPages} from './blueprint-to-html.mjs';
export function buildPreviewManifest(blueprint){
 const pages=blueprintToPages(blueprint);
 if(pages.length>12)throw Error('Too many preview pages');
 const seen=new Set();
 const entries=pages.map((page,index)=>{
  if(!/^[a-zA-Z0-9_-]{1,100}\.html$/.test(page.filename)||seen.has(page.filename))throw Error('Unsafe or duplicate preview filename');
  seen.add(page.filename);
  return {index,filename:page.filename,title:String(page.title||'Website').slice(0,120),bytes:Buffer.byteLength(page.html,'utf8'),sha256:createHash('sha256').update(page.html,'utf8').digest('hex'),sourcePath:typeof blueprint.pages?.[index]?.path==='string'?blueprint.pages[index].path:null};
 });
 return {version:1,kind:'offline-reconstruction-preview',publicationReady:false,requiresHumanReview:true,generatedAt:null,entrypoint:entries[0]?.filename||null,pages:entries,disclaimer:'Generated previews are not verified copies or production deployments.'};
}
