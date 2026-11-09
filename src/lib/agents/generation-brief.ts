import {z} from 'zod';
const Brief=z.object({businessName:z.string().trim().min(2).max(100),industry:z.string().trim().min(2).max(80),summary:z.string().trim().min(15).max(1800),services:z.array(z.string().trim().min(2).max(100)).min(1).max(12)});
export function completeGenerationBrief(payload:unknown){const result=Brief.safeParse(payload);return result.success?result.data:null}
export function requireGenerationBrief(payload:unknown){const brief=completeGenerationBrief(payload);if(!brief)throw Error('Complete business name, type, description and services before generation');return brief}
