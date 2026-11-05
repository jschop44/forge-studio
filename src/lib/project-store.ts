import {Page,PageSchema,defaultPage} from './blocks';
const KEY='forge-studio-pages-v1';
export function readPage(projectId:string):Page{if(typeof window==='undefined')return defaultPage();try{const raw=localStorage.getItem(KEY+':'+projectId);if(raw){const parsed=PageSchema.safeParse(JSON.parse(raw));if(parsed.success)return parsed.data}}catch{}return defaultPage()}
export function savePage(projectId:string,page:Page){if(typeof window==='undefined')return;const parsed=PageSchema.safeParse(page);if(parsed.success)localStorage.setItem(KEY+':'+projectId,JSON.stringify(parsed.data))}
export function exportPage(page:Page){return JSON.stringify(PageSchema.parse(page),null,2)}
