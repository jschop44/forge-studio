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
  if (pages.length === 0) errors.push("No generated pages");
  for (const page of pages) {
    if (!/^[a-z0-9-]{1,64}$/.test(page.slug)) errors.push("Invalid page slug");
    if (slugs.has(page.slug)) errors.push("Duplicate page slug: " + page.slug);
    slugs.add(page.slug);
    if (!/<!doctype html>/i.test(page.html) || !/<html\b/i.test(page.html)) errors.push(page.slug + ": missing HTML document structure");
    if (!/<title\b[^>]*>[^<]+<\/title>/i.test(page.html)) errors.push(page.slug + ": missing page title");
    if (!/<meta\s+name=["']viewport["']/i.test(page.html)) warnings.push(page.slug + ": missing mobile viewport");
    if (!/<h1\b/i.test(page.html)) warnings.push(page.slug + ": missing primary heading");
  }
  for (const page of pages) {
    for (const match of page.html.matchAll(/\bhref=["']([a-z0-9-]+)\.html(?:[?#][^"']*)?["']/gi)) {
      if (!slugs.has(match[1])) errors.push(page.slug + ": broken internal link to " + match[1]);
    }
  }
  return { readyForReview: errors.length === 0, readyForPublishing: false, pageCount: pages.length, errors, warnings };
}
