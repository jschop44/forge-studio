import {immersiveWorldMarkup} from '../../workers/immersive-world.mjs';
import type {GeneratedPage} from './business-site';

export function worldTheme(industry:string):'coffee'|'dining'|'baseball'|'property'|'wellness'|'technology'|'gallery'{
 if(/\b(coffee|caf[eé]|espresso|roaster|roastery)\b/i.test(industry))return 'coffee';
 if(/\b(baseball|softball|sporting goods)\b/i.test(industry))return 'baseball';
 if(/\b(restaurant|dining|bakery|hospitality)\b/i.test(industry))return 'dining';
 if(/\b(real estate|property|architecture|construction)\b/i.test(industry))return 'property';
 if(/\b(health|healthcare|wellness|fitness|spa|beauty|salon)\b/i.test(industry))return 'wellness';
 if(/\b(technology|software|computing|saas)\b/i.test(industry))return 'technology';
 return 'gallery';
}
/** One consistent scene and camera identity across every core and extracted page. */
export function enhanceImmersiveWorld<T extends GeneratedPage>(pages:T[],business:{businessName:string;industry:string}):T[]{
 const targets=pages.map(page=>({slug:page.slug,title:page.title}));
 return pages.map(page=>{
  const html=page.html.replace(/<!--forge-world-start-->[\s\S]*?<!--forge-world-end-->/g,'');
  const markup=immersiveWorldMarkup({businessName:business.businessName,theme:worldTheme(business.industry),pageTitle:page.title,targets:targets.map(target=>({...target,active:target.slug===page.slug}))});
  return {...page,html:html.replace('</body>',markup+'</body>')};
 });
}
