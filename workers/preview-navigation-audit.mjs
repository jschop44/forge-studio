/** Audit offline preview routes without making network requests. */
import {blueprintToPages} from './blueprint-to-html.mjs';
export function auditPreviewNavigation(blueprint){
 const pages=blueprintToPages(blueprint);
 const filenames=new Set(pages.map(p=>p.filename));
 const links=[];
 for(const page of pages){
  const hrefs=[...page.html.matchAll(/<a\s+href="([^"]+)"/g)].map(match=>match[1]);
  for(const href of hrefs){
   const external=/^https:\/\//i.test(href);
   const local=/^[a-zA-Z0-9_-]+\.html$/.test(href);
   const ok=external||local&&filenames.has(href);
   links.push({from:page.filename,href,kind:external?'external':local?'local':'unsafe',ok});
  }
 }
 const reachable=new Set();
 const queue=pages.length?[pages[0].filename]:[];
 while(queue.length){const filename=queue.shift();if(reachable.has(filename))continue;reachable.add(filename);for(const link of links){if(link.from===filename&&link.kind==='local'&&link.ok&&!reachable.has(link.href))queue.push(link.href)}}
 const unreachablePages=pages.map(p=>p.filename).filter(filename=>!reachable.has(filename));
 const broken=links.filter(link=>!link.ok);
 return {version:1,pages:pages.length,links:links.length,localLinks:links.filter(l=>l.kind==='local').length,externalLinks:links.filter(l=>l.kind==='external').length,broken,unreachablePages,allPagesReachable:unreachablePages.length===0,allLinksValid:broken.length===0,publicationReady:false};
}
