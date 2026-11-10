import type {VisualAsset} from './visual-assets';
import {businessEnvironment} from './business-environments';
import {businessArtDirection} from './business-art-direction';
import {immersiveWorldMarkup} from '../../workers/immersive-world.mjs';
import type {GeneratedPage} from './business-site';

export function worldTheme(industry:string):'coffee'|'dining'|'baseball'|'property'|'wellness'|'technology'|'soccer'|'clinical'|'gallery'{
 if(/\b(coffee|caf[eé]|espresso|roaster|roastery)\b/i.test(industry))return 'coffee';
 if(/\b(soccer|association football|football club)\b/i.test(industry))return 'soccer';
 if(/\b(baseball|softball)\b/i.test(industry))return 'baseball';
 if(/\b(restaurant|dining|bakery|hospitality)\b/i.test(industry))return 'dining';
 if(/\b(real estate|property|architecture|construction)\b/i.test(industry))return 'property';
 if(/\b(hospitals?|medical|healthcare|dental|pharmacy|clinic)\b/i.test(industry))return 'clinical';
 if(/\b(health|healthcare|wellness|fitness|spa|beauty|salon)\b/i.test(industry))return 'wellness';
 if(/\b(technology|software|computing|saas)\b/i.test(industry))return 'technology';
 return 'gallery';
}
/** One consistent scene and camera identity across every core and extracted page. */
export function enhanceImmersiveWorld<T extends GeneratedPage>(pages:T[],business:{businessName:string;industry:string;description?:string;services?:string[];visualAssets?:VisualAsset[]}):T[]{
 const targets=pages.map(page=>({slug:page.slug,title:page.title,description:page.slug==='services'&&business.services?.length?business.services.join(' · ').slice(0,220):page.html.match(/<main[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,220)}));
 const direction=businessArtDirection(business.industry,business.businessName);const environment=businessEnvironment(business.industry,business.visualAssets);
 return pages.map(page=>{
  const html=page.html.replace(/<!--forge-world-start-->[\s\S]*?<!--forge-world-end-->/g,'');
  const markup=immersiveWorldMarkup({environment,palette:direction,industry:business.industry,sceneTitle:page.slug==='index'?business.businessName:page.title,businessName:business.businessName,theme:worldTheme(business.industry),intro:page.slug==='index'?business.description?.slice(0,240):undefined,pageTitle:page.title,targets:targets.map(target=>({...target,active:target.slug===page.slug}))});
  return {...page,html:html.replace('</body>',markup+'</body>')};
 });
}
