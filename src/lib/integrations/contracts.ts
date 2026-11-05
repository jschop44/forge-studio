import {z} from 'zod';
export const SourceSchema=z.enum(['growth-lens','leadflow']);
export const BusinessContextSchema=z.object({source:SourceSchema,businessName:z.string().trim().min(1).max(120),website:z.string().url().max(2000).optional(),industry:z.string().max(120).optional(),summary:z.string().max(3000).optional(),issues:z.array(z.object({title:z.string().max(200),priority:z.enum(['high','medium','low']).default('medium'),recommendation:z.string().max(1000)})).max(30).default([]),leadId:z.string().max(150).optional(),auditId:z.string().max(150).optional()});
export type BusinessContext=z.infer<typeof BusinessContextSchema>;
export function siteBriefFromContext(context:BusinessContext){const lines=[context.summary||'',context.industry?'Industry: '+context.industry:'',...context.issues.slice(0,8).map(i=>i.title+': '+i.recommendation)];return lines.filter(Boolean).join('\n').slice(0,1500)}
