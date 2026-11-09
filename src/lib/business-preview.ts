import type {GeneratedPage} from './business-site';

/** Resolve preview links against the emitted pages, never the builder's URL. */
export function previewDestination(href:string,slugs:string[],current:string):{slug:string;hash:string}|null{
 if(!href||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href))return null;
 try{
  const url=new URL(href,'https://preview.invalid/'+current+'.html');
  const name=decodeURIComponent(url.pathname).replace(/\/+$/,'').split('/').pop()||'index';
  const slug=name.replace(/\.html?$/i,'');
  return slugs.includes(slug)?{slug,hash:/^#[a-z0-9_-]{1,100}$/i.test(url.hash)?url.hash:''}:null;
 }catch{return null}
}
function previewRuntime(slugs:string[],current:string,anchor:string,resolve:typeof previewDestination){
 // Install before page controllers; srcdoc otherwise resolves relative URLs to /business.
 document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:event.target instanceof Node?event.target.parentElement:null;
  const link=target?.closest('a[href]');if(!link)return;
  const href=link.getAttribute('href')||'';
  if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href))return;
  event.preventDefault();
  const destination=resolve(href,slugs,current);
  if(!destination){link.setAttribute('aria-description','This destination is not included in this website draft.');return}
  if(destination.slug===current&&destination.hash){document.getElementById(destination.hash.slice(1))?.scrollIntoView();return}
  parent.postMessage({type:'forge-preview-navigate',...destination},'*');
 },true);
 addEventListener('DOMContentLoaded',()=>{if(anchor)requestAnimationFrame(()=>document.getElementById(anchor.slice(1))?.scrollIntoView())},{once:true});
}
export function businessPreviewHtml(page:GeneratedPage|undefined,pages:GeneratedPage[],anchor=''):string{
 if(!page)return '';
 const json=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
 const script='<script id="forge-preview-navigation">('+previewRuntime.toString()+')('+json(pages.map(p=>p.slug))+','+json(page.slug)+','+json(anchor)+','+previewDestination.toString()+');</script>';
 return page.html.replace(/<head(?:\s[^>]*)?>/i,match=>match+script);
}
