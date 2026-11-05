import {Site,SiteSchema,starterSite} from './schema';
const KEY='forge-studio-projects-v1';
export type Project={id:string;site:Site;updatedAt:string};
export function readProjects():Project[]{if(typeof window==='undefined')return [];try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(raw))return [];return raw.flatMap((x:unknown)=>{if(!x||typeof x!=='object')return [];const p=x as Partial<Project>;const parsed=SiteSchema.safeParse(p.site);return parsed.success&&typeof p.id==='string'&&typeof p.updatedAt==='string'?[{id:p.id,site:parsed.data,updatedAt:p.updatedAt}]:[]}).slice(0,50)}catch{return []}}
export function writeProjects(projects:Project[]){localStorage.setItem(KEY,JSON.stringify(projects.slice(0,50)))}
export function saveProject(site:Site):Project[]{const now=new Date().toISOString();const previous=readProjects();const next=[{id:site.id,site,updatedAt:now},...previous.filter(p=>p.id!==site.id)];writeProjects(next);return next}
export function removeProject(id:string){const next=readProjects().filter(p=>p.id!==id);writeProjects(next);return next}
export function freshSite():Site{return {...starterSite,id:crypto.randomUUID(),sections:starterSite.sections.map(s=>({...s}))}}
export function parseImport(text:string):Site{const value=JSON.parse(text);return SiteSchema.parse(value)}
