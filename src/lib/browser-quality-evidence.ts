/** Browser-side evidence collector for generated websites.
 * Designed for Playwright's page.evaluate(): no imports or privileged browser APIs.
 * Never follows links, executes user HTML itself, or sends data to external services.
 */
export type BrowserQualityEvidence={brokenImages:string[];brokenLinks:string[];clippedHeadings:string[];overflowPx:number;images:number;imageAltMissing:number;headingCount:number};
export function collectBrowserQualityEvidence():BrowserQualityEvidence{
 const images=Array.from(document.querySelectorAll('img'));
 // Only high-confidence text clipping: titles extending past the viewport,
 // truncated by their own overflow, or cut by an ancestor's clipping box.
 // Offscreen headings below the fold are not errors.
 const headings=Array.from(document.querySelectorAll('h1,main h2,main h3')).slice(0,40);
 const clippedHeadings=headings.flatMap((heading,index)=>{
  const rect=heading.getBoundingClientRect(),style=getComputedStyle(heading);
  if(rect.width<12||rect.height<12||style.visibility==='hidden'||style.display==='none')return [];
  const outsideViewport=rect.left<-2||rect.right>window.innerWidth+2;
  const ownClipped=(heading.scrollWidth>heading.clientWidth+3&&['hidden','clip'].includes(style.overflowX))
    ||(heading.scrollHeight>heading.clientHeight+3&&['hidden','clip'].includes(style.overflowY));
  let ancestorClipped=false;
  for(let parent=heading.parentElement;parent&&parent!==document.body&&parent!==document.documentElement;parent=parent.parentElement){
   const box=parent.getBoundingClientRect(),css=getComputedStyle(parent);
   if(['hidden','clip'].includes(css.overflowX)&&(rect.left<box.left-3||rect.right>box.right+3)){
    ancestorClipped=true;break;
   }
   if(['hidden','clip'].includes(css.overflowY)&&rect.top>=0&&rect.top<window.innerHeight
      &&(rect.top<box.top-3||rect.bottom>box.bottom+3)){
    ancestorClipped=true;break;
   }
  }
  return outsideViewport||ownClipped||ancestorClipped?[heading.tagName.toLowerCase()+' heading '+(index+1)+' is clipped']:[];
 }).slice(0,20);
 const brokenImages=images.filter(img=>!img.complete||img.naturalWidth===0).map(img=>img.currentSrc||img.src).slice(0,30);
 const brokenLinks=Array.from(document.querySelectorAll('a[href]')).filter(link=>{
  const href=link.getAttribute('href')||'';
  if(!href.startsWith('#')||href==='#')return false;
  try{return !document.getElementById(decodeURIComponent(href.slice(1)))}catch{return true}
 }).map(link=>link.getAttribute('href')||'').slice(0,30);
 return {
  brokenImages,brokenLinks,clippedHeadings,
  overflowPx:Math.max(0,Math.ceil(document.documentElement.scrollWidth-window.innerWidth)),
  images:images.length,
  imageAltMissing:images.filter(img=>!img.hasAttribute('alt')).length,
  headingCount:document.querySelectorAll('h1').length
 };
}

/** Merge browser observations into the existing bounded correction engine's input. */
export function attachBrowserQualityEvidence<T extends {slug:string;html:string}>(page:T,evidence:BrowserQualityEvidence){
 return {...page,brokenImages:evidence.brokenImages,brokenLinks:evidence.brokenLinks,clippedHeadings:evidence.clippedHeadings,overflowPx:evidence.overflowPx};
}
