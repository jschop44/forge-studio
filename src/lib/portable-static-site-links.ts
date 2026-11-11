/** An exported ZIP/download contains flat files named slug.html.
 * Preview URLs such as /services or ./services must not escape the ZIP's
 * directory on a local file system or require server rewrites.
 *
 * Rewrite only observed anchor href attributes for known exported pages. Never
 * execute or change embedded script/style bodies, external URLs, API routes,
 * email links, or unknown file paths.
 */
export function portableStaticSiteLinks(
 html:string,pages:readonly {slug:string}[]
):string{
 const slugs=new Set(pages.map(page=>page.slug).filter(slug=>/^[a-z0-9-]{1,64}$/i.test(slug)));
 const destination=(href:string):string=>{
  if(!href||href.startsWith('#')||href.startsWith('?')||href.startsWith('//')||/^[a-z][a-z\d+.-]*:/i.test(href))return href;
  const home=href.match(/^(?:\/|\.\/)(\?[^#]*)?(#.*)?$/);
  if(home)return slugs.has('index')?'index.html'+(home[1]||'')+(home[2]||''):href;
  const match=href.match(/^(?:\.\/|\/)?([a-z0-9-]+)(?:\.html)?\/?(\?[^#]*)?(#.*)?$/i);
  if(!match||!slugs.has(match[1]))return href;
  return match[1]+'.html'+(match[2]||'')+(match[3]||'');
 };
 // Protected blocks must be consumed first so that quoted HTML in scripts is
 // not rewritten as if it were a link in the document.
 return html.replace(/(<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>)|<a\b[^>]*>/gi,
  (tag,protectedBlock:string|undefined)=>{
   if(protectedBlock)return tag;
   return tag.replace(/(\shref\s*=\s*)(["'])(.*?)\2/i,(_attribute,prefix:string,quote:string,href:string)=>
    prefix+quote+destination(href)+quote);
  });
}
