import {relevantVisualAssets,type VisualAsset} from './visual-assets';
import {findBusinessPanorama} from './environment-catalog';
import {industryPhotos} from './industry-photos';
export type BusinessEnvironment={kind:'panorama'|'spatial-gallery';url:string;cropTop:number;cropHeight:number;credit:string;source:string;license:string;gallery:string[];initialYaw?:number;autoOrient?:boolean;credits?:VisualAsset[]};
/** A scene must match its niche. Never substitute a soccer stadium for baseball. */
export function businessEnvironment(industry:string,assets:VisualAsset[]=[]):BusinessEnvironment{
 const verified=relevantVisualAssets(industry,assets);const gallery=verified.length?verified.map(asset=>asset.url):industryPhotos(industry);
 const base={cropTop:0,cropHeight:1,gallery,credits:verified};
 if(/\b(baseball|softball)\b/i.test(industry))return {...base,kind:'panorama',url:'https://upload.wikimedia.org/wikipedia/commons/8/80/Meiji_Jingu_Stadium_2024_April_23_-_360_panorama.jpeg',cropTop:1037/4053,cropHeight:1582/4053,initialYaw:-2.15,credit:'Meiji Jingu Stadium · Nesnad · resized for display',source:'https://commons.wikimedia.org/wiki/File:Meiji_Jingu_Stadium_2024_April_23_-_360_panorama.jpeg',license:'https://creativecommons.org/licenses/by/4.0/'};
 const asset=/\b(coffee|caf[eé]|roast|espresso)\b/i.test(industry)?'comfy_cafe':/\b(soccer|association football|football club)\b/i.test(industry)?'stadium_01':/\b(fitness|gym)\b/i.test(industry)?'gym_01':null;
 if(asset)return {...base,kind:'panorama',initialYaw:asset==='comfy_cafe'?-1.25:0,url:'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/'+asset+'.jpg',credit:'Illustrative environment · Poly Haven · CC0',source:'https://polyhaven.com/a/'+asset,license:'https://creativecommons.org/publicdomain/zero/1.0/'};
 const discovered=findBusinessPanorama(industry);
 if(discovered)return {...base,...discovered,kind:'panorama',initialYaw:0,autoOrient:true};
 return {...base,kind:'spatial-gallery',url:gallery[0]||'',credit:verified.length?'Niche-matched image gallery':'Business image gallery · illustrative stock imagery',source:verified[0]?.source||'https://unsplash.com/license',license:verified.length?'https://creativecommons.org/licenses/':'https://unsplash.com/license'};
}
