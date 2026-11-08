import {z} from 'zod';
const Payload=z.object({
 businessName:z.string().trim().min(2).max(100).optional(),
 industry:z.string().trim().min(2).max(80).optional(),
 summary:z.string().max(1800).optional(),
 services:z.array(z.string().trim().min(1).max(100)).max(12).optional(),
 website:z.string().url().optional(),
 html:z.string().max(16000).optional(),
 pages:z.array(z.object({slug:z.string().min(1).max(64),title:z.string().max(200),html:z.string().min(1).max(16000)})).min(1).max(12).optional()
}).passthrough();
export const JobRequestSchema=z.object({
 kind:z.enum(['lead-enrichment','website-audit','site-plan','site-generation','quality-review','publish-review']),
 source:z.enum(['leadflow','growth-lens','forge-studio']),payload:Payload
}).superRefine((value,ctx)=>{
 if(value.kind==='website-audit'&&(!value.payload.website||!value.payload.html?.trim()))ctx.addIssue({code:'custom',path:['payload'],message:'Website audit requires a URL and supplied HTML; this worker does not crawl websites.'});
 if(value.kind==='quality-review'&&!value.payload.html?.trim()&&!value.payload.pages?.length)ctx.addIssue({code:'custom',path:['payload'],message:'Quality review requires supplied HTML or generated pages.'});
});
