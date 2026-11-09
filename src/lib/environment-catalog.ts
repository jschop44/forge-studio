import catalog from './data/environment-catalog.json';
import {nicheTerms} from './visual-assets';
/** Search asset evidence, not a list of supported business categories. Snapshot: Poly Haven HDRI API, CC0. */
export function findBusinessPanorama(industry:string){
 const terms=nicheTerms(industry).filter(term=>!['hospitality','practice','group','retail','agency','studio','training','center','centre','consulting'].includes(term));
 const word=(value:string)=>value.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).map(w=>w.replace(/s$/,''));
 const wanted=terms.map(t=>t.replace(/s$/,''));if(!wanted.length)return null;
 const ranked=catalog.flatMap(asset=>{
  if(asset.excluded)return [];
  const name=word(asset.name),tags=word(asset.tags.join(' '));
  const score=wanted.reduce((sum,term)=>sum+(name.includes(term)?6:0)+(tags.includes(term)?4:0),0);
  if(score<8||!wanted.every(term=>name.includes(term)||tags.includes(term)))return [];
  return [{asset,score:score+(asset.tags.includes('clean')?2:0)+(asset.categories.includes('natural light')?1:0)}];
 }).sort((a,b)=>b.score-a.score||a.asset.id.localeCompare(b.asset.id));
 const selected=ranked[0]?.asset;
 return selected?{url:'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/'+selected.id+'.jpg',credit:selected.name+' · '+selected.authors+' / Poly Haven · CC0',source:'https://polyhaven.com/a/'+selected.id,license:'https://creativecommons.org/publicdomain/zero/1.0/'}:null;
}
