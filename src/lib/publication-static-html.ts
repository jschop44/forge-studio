/** JSON-LD is inert metadata, not a website runtime. Only an exact data-only
 * script element with object/array JSON may be excluded from active-code checks.
 * Keep the original HTML unchanged for storage and fail closed on all other scripts.
 */
export function withoutPublicationJsonLd(html:string):string{
 return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script[ \t\r\n\f]*>/gi,(element,attributes:string,body:string)=>{
  if(!/^[ \t\r\n\f]+type[ \t\r\n\f]*=[ \t\r\n\f]*(?:"application\/ld\+json"|'application\/ld\+json')[ \t\r\n\f]*$/i.test(attributes)||body.length>64_000)return element;
  try{const data:unknown=JSON.parse(body);return data!==null&&typeof data==='object'?'':element}catch{return element}
 });
}
