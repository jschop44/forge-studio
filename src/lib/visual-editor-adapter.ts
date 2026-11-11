/** Integration-first editor contract. No third-party editor scripts are loaded server-side. */
import sanitizeHtml from 'sanitize-html';
import {escapeHtml} from './export';
import type {GeneratedPage} from './business-site';

export type VisualEditorDocument={version:1;slug:string;title:string;bodyHtml:string;css:string;bodyAttributes:Record<string,string>;warnings:string[]};

function metadata(html:string){
 let language='en',direction='',description='';
 const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
 sanitizeHtml(head,{onOpenTag:(tag,attrs)=>{if(tag==='meta'&&attrs.name?.toLowerCase()==='description')description=(attrs.content||'').slice(0,500)}});
 const htmlAttrs=html.match(/<html\b([^>]*)>/i)?.[1]||'';
 sanitizeHtml('<div'+htmlAttrs+'></div>',{transformTags:{div:(tag,attrs)=>{if(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(attrs.lang||''))language=attrs.lang;if(['ltr','rtl'].includes(attrs.dir))direction=attrs.dir;return {tagName:tag,attribs:{}}}}});
 return {htmlAttributes:' lang="'+escapeHtml(language)+'"'+(direction?' dir="'+direction+'"':''),description:description?'<meta name="description" content="'+escapeHtml(description)+'">':''};
}

/** Convert Forge output to an editor-neutral format for GrapesJS or another adapter.
 * Scripts are deliberately excluded: third-party runtime code must never be imported into an editor.
 * Only the sanitized result may be previewed or exported; source runtime scripts are never executed.
 */
export function prepareVisualEditorDocument(page:GeneratedPage):VisualEditorDocument{
 const html=page.html;
 const warnings:string[]=[];
 const bodyAttributes:Record<string,string>={};
 if(html.length>2_000_000)return {version:1,slug:page.slug,title:page.title,bodyHtml:'',css:'',bodyAttributes,warnings:['Page exceeds the editor size limit.']};
 const attributes=html.match(/<body\b([^>]*)>/i)?.[1]||'';
 sanitizeHtml('<div'+attributes+'></div>',{transformTags:{div:(tag,attrs)=>{for(const [key,value] of Object.entries(attrs)){if(key==='class'&&/^[a-z0-9_ -]{0,500}$/i.test(value)||key==='data-forge-layout'&&['editorial','image-led'].includes(value)||key==='data-forge-experience'&&['standard','cinematic','object-navigation','immersive'].includes(value))bodyAttributes[key]=value}return {tagName:tag,attribs:{}}}}});
 const css=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]).join('\n');
 if(css.length>500_000)return {version:1,slug:page.slug,title:page.title,bodyHtml:'',css:'',bodyAttributes,warnings:['Styles exceed the editor size limit.']};
 const body=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]||'';
 if(!body)warnings.push('Generated page has no complete body; editor preview is unavailable.');
 if(/<script\b/i.test(html))warnings.push('Executable scripts are excluded from visual editor previews.');
 let bodyHtml=body.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/\s(?:srcdoc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
 const unsafeMarkup=/<(?:script|iframe|object|embed|form|base|meta|link|svg|math|template|video|audio|source)\b/i.test(bodyHtml)||/\b(?:javascript|vbscript|data):/i.test(bodyHtml)||/<style\b/i.test(bodyHtml)||/\b(?:srcset|formaction|xlink:href|ping)\s*=/i.test(bodyHtml)||/\bstyle\s*=/i.test(bodyHtml)||/<!--|<!\[CDATA\[/i.test(bodyHtml);
 const unsafeCss=/(?:@import|expression\s*\(|url\s*\(|behavior\s*:|@font-face|@namespace|-moz-binding|\\)/i.test(css.replace(/\/\*[\s\S]*?\*\//g,''));
 let unsafeUrl=false;
 bodyHtml=sanitizeHtml(bodyHtml,{allowedTags:['a','abbr','article','aside','b','blockquote','br','button','caption','code','col','colgroup','dd','details','div','dl','dt','em','figcaption','figure','footer','h1','h2','h3','h4','h5','h6','header','hr','i','img','li','main','nav','ol','p','pre','s','section','small','span','strong','sub','summary','sup','table','tbody','td','th','thead','time','tr','u','ul'],allowedAttributes:{'*':['id','class','title','role','tabindex','aria-*','data-*','hidden'],a:['href','target','rel'],img:['src','alt','width','height','loading','decoding'],button:['type','disabled'],td:['colspan','rowspan'],th:['colspan','rowspan','scope'],time:['datetime'],details:['open']},allowedSchemes:['https','http','mailto','tel'],allowProtocolRelative:false,transformTags:{'*':(tag,attrs)=>{for(const key of Object.keys(attrs))if(key.startsWith('data-gjs-'))delete attrs[key];for(const key of ['href','src'])if(attrs[key]){const value=attrs[key].replace(/[\u0000-\u0020]/g,'');if(/^(?:javascript|vbscript|data):/i.test(value)||value.startsWith('//')||(/^[a-z][a-z\d+.-]*:/i.test(value)&&!(/^(?:https?|mailto|tel):/i.test(value))))unsafeUrl=true}return {tagName:tag,attribs:attrs}}}});
 if(unsafeMarkup||unsafeCss||unsafeUrl){warnings.push('Unsupported active markup or CSS. Preview blocked.');return {version:1,slug:page.slug,title:page.title,bodyHtml:'',css:'',bodyAttributes,warnings};}
 return {version:1,slug:page.slug,title:page.title,bodyHtml,css,bodyAttributes,warnings};
}

/** Serialize only the validated, script-free document used by the editor preview. */
export function serializeVisualEditorDocument(page:GeneratedPage):{html:string;warnings:string[]}{
 const document=prepareVisualEditorDocument(page);
 if(!document.bodyHtml)return {html:'',warnings:document.warnings};
 const meta=metadata(page.html);
 const title=page.title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 return {html:'<!doctype html><html'+meta.htmlAttributes+'><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+title+'</title>'+meta.description+'<style>'+document.css+'</style></head><body'+Object.entries(document.bodyAttributes).map(([key,value])=>' '+key+'="'+escapeHtml(value)+'"').join('')+'>'+document.bodyHtml+'</body></html>',warnings:document.warnings};
}

export function serializeEditorDraft(page:GeneratedPage,body:string,css:string,attributes:Record<string,string>={}){
 const meta=metadata(page.html);
 const attrs=Object.entries(attributes).map(([key,value])=>' '+key+'="'+escapeHtml(value)+'"').join('');
 return serializeVisualEditorDocument({...page,html:'<!doctype html><html'+meta.htmlAttributes+'><head>'+meta.description+'<style>'+css+'</style></head><body'+attrs+'>'+body+'</body></html>'});
}
