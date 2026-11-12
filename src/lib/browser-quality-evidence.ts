/** Browser-side evidence collector for generated websites.
 * Designed for Playwright's page.evaluate(): no imports or privileged browser APIs.
 * Never follows links, executes user HTML itself, or sends data to external services.
 */
export type BrowserQualityEvidence={brokenImages:string[];brokenLinks:string[];overflowPx:number;images:number;imageAltMissing:number;headingCount:number};
export function collectBrowserQualityEvidence():BrowserQualityEvidence{
 const images=Array.from(document.querySelectorAll('img'));
 const brokenImages=images.filter(img=>!img.complete||img.naturalWidth===0).map(img=>img.currentSrc||img.src).slice(0,30);
 const brokenLinks=Array.from(document.querySelectorAll('a[href]')).filter(link=>{
  const href=link.getAttribute('href')||'';
  if(!href.startsWith('#')||href==='#')return false;
  try{return !document.getElementById(decodeURIComponent(href.slice(1)))}catch{return true}
 }).map(link=>link.getAttribute('href')||'').slice(0,30);
 return {
  brokenImages,brokenLinks,
  overflowPx:Math.max(0,Math.ceil(document.documentElement.scrollWidth-window.innerWidth)),
  images:images.length,
  imageAltMissing:images.filter(img=>!img.hasAttribute('alt')).length,
  headingCount:document.querySelectorAll('h1').length
 };
}
