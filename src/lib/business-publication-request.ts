import {z} from 'zod';
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
  return {valid:report.errors.length===0,errors:report.errors,businessName:parsed.data.businessName,pages:parsed.data.pages};
}
