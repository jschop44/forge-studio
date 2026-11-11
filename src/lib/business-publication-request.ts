import {z} from 'zod';
import {withoutPublicationJsonLd} from './publication-static-html';
import {auditGeneratedDraft} from './draft-quality-gate';
import type {GeneratedPage} from './business-site';

/** Validate owner-submitted drafts before any database mutation. */
export const BusinessPublicationRequestSchema=z.object({
  ownerApproved:z.literal(true),
  businessName:z.string().trim().min(2).max(100),
  pages:z.array(z.object({
    slug:z.string().regex(/^[a-z0-9-]{1,64}$/),
    title:z.string().trim().min(1).max(160),
    html:z.string().min(30).max(300_000),
  }).strict()).min(1).max(20),
}).strict();

export function validateBusinessPublicationRequest(input:unknown):{
  valid:boolean;errors:string[];businessName?:string;pages?:GeneratedPage[];
}{
  const parsed=BusinessPublicationRequestSchema.safeParse(input);
  if(!parsed.success)return {valid:false,errors:parsed.error.issues.map(issue=>issue.path.join('.')+': '+issue.message)};
  const report=auditGeneratedDraft(parsed.data.pages);
  const errors=[...report.errors];
  for(const page of parsed.data.pages){
    const activeHtml=withoutPublicationJsonLd(page.html);
    // Published HTML is intentionally static. Reject active or embedded content
    // rather than relying on the response CSP alone to contain it.
    if(/<\s*script\b/i.test(activeHtml)||/<\s*(iframe|object|embed|form|base)\b/i.test(page.html))errors.push(page.slug+': active or embedded HTML is not allowed');
    if(/<\s*meta\b[^>]*http-equiv\s*=\s*[\"']?refresh\b/i.test(page.html))errors.push(page.slug+': automatic redirects are not allowed');
    if(/\bon[a-z]+\s*=/i.test(page.html))errors.push(page.slug+': inline event handlers are not allowed');
    if(/<\s*(svg|math|template|link)\b/i.test(page.html))errors.push(page.slug+': unsupported embedded, stylesheet or foreign HTML elements are not allowed');
    if(/\b(?:srcdoc|formaction|xlink:href)\s*=/i.test(page.html))errors.push(page.slug+': unsafe embedded or action attributes are not allowed');
  }
  return {valid:errors.length===0,errors,businessName:parsed.data.businessName,pages:parsed.data.pages};
}
