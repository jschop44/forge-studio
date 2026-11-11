import type {GeneratedPage} from './business-site';
export function parseEditorSite(raw:string|null):GeneratedPage[]{
 if(!raw||raw.length>8_000_000)return [];
 try{
  const pages:unknown=JSON.parse(raw);
  if(!Array.isArray(pages)||!pages.length||pages.length>30)return [];
  const slugs=new Set<string>();
  for(const page of pages){if(!page||typeof page.slug!=='string'||!/^[a-z0-9][a-z0-9-]{0,63}$/i.test(page.slug)||slugs.has(page.slug)||typeof page.title!=='string'||page.title.length>200||typeof page.html!=='string'||page.html.length>2_000_000)return [];slugs.add(page.slug)}
  return pages.map(({slug,title,html})=>({slug,title,html}));
 }catch{return []}
}
export function replaceEditorPage(pages:GeneratedPage[],page:GeneratedPage):GeneratedPage[]{
 const next=pages.some(item=>item.slug===page.slug)?pages.map(item=>item.slug===page.slug?page:item):[...pages,page];
 if(!parseEditorSite(JSON.stringify(next)).length)throw Error('Website exceeds the editor page or size limit.');
 return next;
}
