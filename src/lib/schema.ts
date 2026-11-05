import { z } from 'zod';
export const SiteSchema = z.object({
  id:z.string(), name:z.string().min(1), tagline:z.string(), description:z.string(),
  accent:z.string().regex(/^#[0-9a-fA-F]{6}$/), template:z.enum(['ember','minimal','editorial']),
  cta:z.string(), sections:z.array(z.object({id:z.string(),title:z.string(),body:z.string()}))
});
export type Site = z.infer<typeof SiteSchema>;
export const starterSite:Site={id:'demo',name:'EMBER',tagline:'Make an impression.',description:'Immersive digital experiences built for bold brands.',accent:'#ff6846',template:'ember',cta:'Explore collection',sections:[{id:'story',title:'Designed to stand apart',body:'A digital presence that feels as exceptional as your product.'},{id:'features',title:'Every detail matters',body:'Smooth motion, rich visuals and a responsive experience.'}]};
export function generateDraft(name:string,description:string,template:Site['template']):Site {
 const safe=name.trim().slice(0,80)||'Your Brand'; const desc=description.trim().slice(0,400)||'An extraordinary brand experience.';
 return {...starterSite,id:crypto.randomUUID(),name:safe,tagline:`Discover ${safe}.`,description:desc,template,accent:template==='ember'?'#ff6846':template==='minimal'?'#9de2d0':'#dbb5ff'};
}