import {escapeHtml} from './export';
import type {Site} from './schema';
export function seoHead(site:Site,canonical?:string){
 const s=escapeHtml,title=site.name.slice(0,70),description=site.description.slice(0,160);
 const url=canonical&&/^https:\/\/[a-z0-9.-]+(?:\/[^<>" ]*)?$/i.test(canonical)?canonical:undefined;
 const schema={'@context':'https://schema.org','@type':'Organization',name:site.name,description:site.description,...(url?{url}:{})};
 return '<meta name="description" content="'+s(description)+'"><meta property="og:type" content="website"><meta property="og:title" content="'+s(title)+'"><meta property="og:description" content="'+s(description)+'"><meta name="twitter:card" content="summary_large_image">'+(url?'<link rel="canonical" href="'+s(url)+'">':'')+'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>';
}
