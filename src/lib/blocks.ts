import {z} from 'zod';
export const BlockSchema=z.discriminatedUnion('type',[
 z.object({id:z.string(),type:z.literal('heading'),text:z.string().max(500),align:z.enum(['left','center','right'])}),
 z.object({id:z.string(),type:z.literal('paragraph'),text:z.string().max(3000),align:z.enum(['left','center','right'])}),
 z.object({id:z.string(),type:z.literal('button'),text:z.string().max(120),url:z.string().max(1000)}),
 z.object({id:z.string(),type:z.literal('spacer'),height:z.number().int().min(8).max(200)})
]);
export const PageSchema=z.object({id:z.string(),title:z.string().min(1).max(120),slug:z.string().regex(/^[a-z0-9-]+$/),blocks:z.array(BlockSchema).max(100)});
export type Block=z.infer<typeof BlockSchema>;export type Page=z.infer<typeof PageSchema>;
export function defaultPage():Page{return {id:crypto.randomUUID(),title:'Home',slug:'home',blocks:[{id:crypto.randomUUID(),type:'heading',text:'Welcome to your new website',align:'center'},{id:crypto.randomUUID(),type:'paragraph',text:'Create an unforgettable experience.',align:'center'},{id:crypto.randomUUID(),type:'button',text:'Get started',url:'#contact'}]}}
export function safeHref(url:string){const s=url.trim();if(s.startsWith('#')&&/^#[a-zA-Z0-9_-]+$/.test(s))return s;if(/^https:\/\//i.test(s))return s;return '#contact'}
