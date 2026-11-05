import {ExperienceSchema,type Experience} from './experiences';
const KEY='forge-experiences-v1';
export function loadExperiences():Experience[]{if(typeof window==='undefined')return [];try{const items=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(items)?items.flatMap(x=>{const r=ExperienceSchema.safeParse(x);return r.success?[r.data]:[]}).slice(0,30):[]}catch{return []}}
export function saveExperience(item:Experience){const parsed=ExperienceSchema.parse(item);const previous=loadExperiences();localStorage.setItem(KEY,JSON.stringify([parsed,...previous.filter(x=>x.id!==parsed.id)].slice(0,30)))}
export function deleteExperience(id:string){localStorage.setItem(KEY,JSON.stringify(loadExperiences().filter(x=>x.id!==id)))}
