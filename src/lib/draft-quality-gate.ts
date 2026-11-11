import type { GeneratedPage } from "./business-site";

export type DraftQualityReport = {
  readyForReview: boolean;
  readyForPublishing: false;
  pageCount: number;
  errors: string[];
  warnings: string[];
};

/**
 * Static QA for generated drafts. Passing does not imply a deployed site,
 * working backend forms, verified external links, or publishing approval.
 */
export function auditGeneratedDraft(pages: GeneratedPage[]): DraftQualityReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const slugs = new Set<string>();
  const contentImagePages = new Map<string,Set<string>>();
  const fragmentTargets = new Map<string,Set<string>>();
  if (pages.length === 0) errors.push("No generated pages");
  for (const page of pages) {
    if (!/^[a-z0-9-]{1,64}$/.test(page.slug)) errors.push("Invalid page slug");
    if (slugs.has(page.slug)) errors.push("Duplicate page slug: " + page.slug);
    slugs.add(page.slug);
    // Match actual HTML id/name attributes, not data-id, and validate cross-page fragments later.
    const ids=new Set<string>();
    for(const match of page.html.matchAll(/\s(?:id|name)\s*=\s*(["'])([^"']+)\1/gi))ids.add(match[2]);
    fragmentTargets.set(page.slug,ids);
    if (!/<!doctype html>/i.test(page.html) || !/<html\b/i.test(page.html)) errors.push(page.slug + ": missing HTML document structure");
    if (!/<title\b[^>]*>[^<]+<\/title>/i.test(page.html)) errors.push(page.slug + ": missing page title");
    if (!/<meta\s+name=["']viewport["']/i.test(page.html)) warnings.push(page.slug + ": missing mobile viewport");
    if (!/<h1\b/i.test(page.html)) warnings.push(page.slug + ": missing primary heading");
    // A decorated shell with no meaningful main content is not a reviewable website.
    const main=page.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
    if(main!==undefined){
      const readable=main.replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)>/gi,'')
        .replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|#160);/gi,' ').replace(/&[a-z\d#]+;/gi,' ').replace(/\s+/g,' ').trim();
      const hasVisual=/<(?:img|video|canvas|svg)\b/i.test(main);
      if(!readable&&!hasVisual)errors.push(page.slug+": empty main content");
      else if(readable.length<30&&!hasVisual)warnings.push(page.slug+": very little visible content; review this page for a blank or placeholder layout");
    }

    // A form without a real action looks interactive but silently posts back to
    // the static preview. Treat it as a broken workflow, not a working contact form.
    // Even explicit actions still require live backend and delivery verification.
    for(const match of page.html.matchAll(/<form\b[^>]*>/gi)){
      const tag=match[0];
      const action=tag.match(/\saction\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim();
      if(!action||action==='#'||action.startsWith('#')||/^(?:javascript:|data:|blob:)/i.test(action)){
        errors.push(page.slug+": form has no functioning submission destination");
        continue;
      }
      if(/^(?:http:|\/\/)/i.test(action)){
        errors.push(page.slug+": form submits to an insecure destination");
        continue;
      }
      if(/^\w+:/i.test(action)&&!/^https:/i.test(action)){
        errors.push(page.slug+": form submission scheme is unsupported");
        continue;
      }
      // Code inspection cannot confirm external form delivery, database writes
      // or consent capture, so leave publishing gated regardless of the action.
      warnings.push(page.slug+": form submission backend and delivery remain unverified");
    }
    // Source photographs can differ by crop parameters but still be the same photo.
    // Repeating a company logo is intentional; repeating a content photo is flagged.
    for(const image of page.html.matchAll(/<img\b[^>]*>/gi)){
      const tag=image[0];
      const src=tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
      if(!src||/^(?:data:|blob:|javascript:)/i.test(src))continue;
      const alt=tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1]||'';
      const className=tag.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1]||'';
      if(/\blogo\b|brand[-_ ]?(?:mark|logo)/i.test(alt+' '+className)||/(?:^|[/_-])(?:logo|brand[-_]?mark)(?:[._/-]|$)/i.test(src))continue;
      const key=src.split(/[?#]/)[0].toLowerCase();
      if(!key)continue;
      const used=contentImagePages.get(key)||new Set<string>();
      used.add(page.slug);contentImagePages.set(key,used);
    }

  }
  for (const page of pages) {
    for (const match of page.html.matchAll(/\shref\s*=\s*(["'])([^"']*)\1/gi)) {
      const href=match[2].trim();
      // A browser may treat whitespace/control characters or protocol-relative
      // destinations differently from a naive static string check.
      if(!href||href==='#'||/[\u0000-\u001f\u007f\\]/.test(href)||href.startsWith('//')){
        errors.push(page.slug+": nonfunctional or unsafe link destination");
        continue;
      }
      const scheme=href.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
      if(scheme){
        if(!['https','mailto','tel'].includes(scheme)||href.toLowerCase()===scheme+':'){
          errors.push(page.slug+": nonfunctional or unsafe link destination");
        }else if(scheme==='https'){
          try{
            const url=new URL(href);
            if(url.username||url.password)errors.push(page.slug+": external link must not include credentials");
          }catch{errors.push(page.slug+": invalid external link destination");}
        }
        // Live external delivery and destinations cannot be verified offline.
        continue;
      }
      const local=href.match(/^([^?#]*)(?:\?[^#]*)?(?:#(.*))?$/);
      if(!local){
        errors.push(page.slug+": invalid internal link destination");
        continue;
      }
      const path=local[1];
      let target=page.slug;
      if(path==='/'||path==='./')target='index';
      else if(path){
        // Exported drafts contain flat HTML pages. Support both filename and
        // extensionless page links, with root-relative and ./ forms.
        const route=path.match(/^(?:\.\/|\/)?([a-z0-9-]+)(?:\.html)?\/?$/i);
        if(!route){
          if(/^(?:\.{1,2}\/|\/)?[^?#]+(?:\/|\.html)$/i.test(path))
            errors.push(page.slug+": unresolved internal link destination: "+path.slice(0,100));
          else warnings.push(page.slug+": non-page link requires live destination verification: "+path.slice(0,100));
          continue;
        }
        target=route[1];
      }
      if(!slugs.has(target)){
        errors.push(page.slug+": broken internal link to "+target);
        continue;
      }
      if(local[2]!==undefined){
        let id:string;
        try{id=decodeURIComponent(local[2]);}catch{
          errors.push(page.slug+": malformed internal link fragment");
          continue;
        }
        if(!id||!fragmentTargets.get(target)?.has(id))
          errors.push(page.slug+": broken internal fragment "+target+"#"+id.slice(0,100));
      }
    }
  }
  for(const [url,used] of contentImagePages){
    if(used.size>1)warnings.push("Repeated content image across "+used.size+" pages: "+url.slice(0,150)+". Review image diversity.");
  }
  return { readyForReview: errors.length === 0, readyForPublishing: false, pageCount: pages.length, errors, warnings };
}
