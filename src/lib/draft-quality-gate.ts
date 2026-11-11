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
  if (pages.length === 0) errors.push("No generated pages");
  for (const page of pages) {
    if (!/^[a-z0-9-]{1,64}$/.test(page.slug)) errors.push("Invalid page slug");
    if (slugs.has(page.slug)) errors.push("Duplicate page slug: " + page.slug);
    slugs.add(page.slug);
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
    for (const match of page.html.matchAll(/\bhref=["']([a-z0-9-]+)\.html(?:[?#][^"']*)?["']/gi)) {
      if (!slugs.has(match[1])) errors.push(page.slug + ": broken internal link to " + match[1]);
    }
  }
  for(const [url,used] of contentImagePages){
    if(used.size>1)warnings.push("Repeated content image across "+used.size+" pages: "+url.slice(0,150)+". Review image diversity.");
  }
  return { readyForReview: errors.length === 0, readyForPublishing: false, pageCount: pages.length, errors, warnings };
}
