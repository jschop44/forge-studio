import {z} from 'zod';
export const BusinessBriefSchema=z.object({name:z.string().trim().min(1).max(80),description:z.string().trim().max(1500),template:z.enum(['ember','minimal','editorial'])});
export function cleanText(value:string,max=500){return value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}
export function slugify(value:string){return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'untitled'}
