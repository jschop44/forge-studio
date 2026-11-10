/** Integration-first editor contract. No third-party editor scripts are loaded server-side. */
import type {GeneratedPage} from './business-site';

export type VisualEditorDocument={version:1;slug:string;title:string;bodyHtml:string;css:string;warnings:string[]};

/** Convert Forge output to an editor-neutral format for GrapesJS or another adapter.
 * Scripts are deliberately excluded: third-party runtime code must never be imported into an editor.
 * The original generated HTML remains the publishable source until a separate save/validation path exists.
 */
export function prepareVisualEditorDocument(page:GeneratedPage):VisualEditorDocument{
 const html=page.html.slice(0,2_000_000);
 const warnings:string[]=[];
 const css=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]).join('\n').slice(0,500_000);
 const body=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]||'';
 if(!body)warnings.push('Generated page has no complete body; editor preview is unavailable.');
 if(/<script\b/i.test(html))warnings.push('Executable scripts are excluded from visual editor previews.');
 const bodyHtml=body.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/\s(?:srcdoc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
 const unsafeMarkup=/<(?:iframe|object|embed|form|base|meta|link|svg|math|template)\b/i.test(bodyHtml)||/\b(?:javascript|vbscript|data):/i.test(bodyHtml)||/<style\b/i.test(bodyHtml);
 if(unsafeMarkup){warnings.push('Potentially active markup requires a full HTML sanitizer before visual editing. Preview blocked.');return {version:1,slug:page.slug,title:page.title,bodyHtml:'',css:'',warnings};}
 return {version:1,slug:page.slug,title:page.title,bodyHtml,css,warnings};
}
