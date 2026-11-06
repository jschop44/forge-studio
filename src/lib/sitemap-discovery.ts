/** Extract candidate same-origin page paths from a public sitemap document.
 * This parser does not fetch URLs or follow links.
 */
export function sitemapPages(xml:string,origin:string,limit=12):{label:string;path:string}[]{
 const pages:{label:string;path:string}[]=[];
 if(xml.length>250000||limit<1)return pages;
 for(const entry of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)){
  if(pages.length>=limit)break;
  try{
   const url=new URL(entry[1].replace(/&amp;/g,'&'));
   if(url.origin!==origin||url.protocol!=='https:'||url.pathname==='/'||url.pathname.length>140||/\.(xml|pdf|png|jpe?g|gif|svg|webp|mp4|zip)$/i.test(url.pathname))continue;
   const segment=decodeURIComponent(url.pathname.split('/').filter(Boolean).pop()||'');
   if(!segment||/^(privacy|terms|login|account|sitemap|cookies)$/i.test(segment)||pages.some(p=>p.path===url.pathname))continue;
   pages.push({label:segment.replace(/[-_]+/g,' ').slice(0,60),path:url.pathname});
  }catch{continue}
 }
 return pages;
}
