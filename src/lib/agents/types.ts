import {z} from 'zod';
export const AgentTaskSchema=z.object({id:z.string().uuid(),tenantId:z.string().uuid(),kind:z.enum(['lead-enrichment','website-audit','site-plan','site-generation','quality-review','publish-review']),source:z.enum(['leadflow','growth-lens','forge-studio']),payload:z.record(z.string(),z.unknown()),attempt:z.number().int().min(0).max(5).default(0),createdAt:z.string().datetime()});
export type AgentTask=z.infer<typeof AgentTaskSchema>;
export type AgentDecision={taskId:string;status:'ready'|'needs-approval'|'blocked';reason:string;next?:AgentTask['kind']};
