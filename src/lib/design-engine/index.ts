import {businessArtDirection} from '../business-art-direction';
import type {WebsiteDesignDna} from '../website-design-dna';

/** License-reviewed, built-in design patterns. External libraries are evaluated separately. */
export type DesignPattern={
 id:string;label:string;industries:readonly string[];layout:'editorial'|'showcase'|'catalog'|'service';
 immersive:'none'|'optional'|'recommended';motion:'subtle'|'cinematic';
 license:'original';requiresWebGL:boolean;
};
export const DESIGN_PATTERNS:readonly DesignPattern[]=[
 {id:'editorial-premium',label:'Premium editorial',industries:['legal','finance','property','fashion','hospitality'],layout:'editorial',immersive:'optional',motion:'subtle',license:'original',requiresWebGL:false},
 {id:'product-showcase',label:'Interactive product showcase',industries:['automotive','technology','fashion','industry'],layout:'showcase',immersive:'recommended',motion:'cinematic',license:'original',requiresWebGL:false},
 {id:'hospitality-story',label:'Hospitality storytelling',industries:['coffee','dining','hospitality','wellness'],layout:'editorial',immersive:'optional',motion:'cinematic',license:'original',requiresWebGL:false},
 {id:'commerce-catalog',label:'Product catalog',industries:['fashion','animals','nature','technology'],layout:'catalog',immersive:'optional',motion:'subtle',license:'original',requiresWebGL:false},
 {id:'trusted-services',label:'Trusted services',industries:['clinical','legal','trades','finance','education'],layout:'service',immersive:'none',motion:'subtle',license:'original',requiresWebGL:false},
 {id:'adaptive-general',label:'Adaptive business',industries:[],layout:'service',immersive:'optional',motion:'subtle',license:'original',requiresWebGL:false}
] as const;
export type DesignRequest={businessName:string;industry:string;mode?:'auto'|'library';patternId?:string;immersive3d?:boolean;sourceDesign?:WebsiteDesignDna};
export type DesignDecision={patternId:string;mode:'auto'|'library';artDirection:ReturnType<typeof businessArtDirection>;immersive3d:boolean;motion:'subtle'|'cinematic';sourcePreservation:boolean;warnings:string[]};
/** Deterministic policy layer: AI may propose a pattern but cannot bypass these checks. */
export function planAdaptiveDesign(request:DesignRequest):DesignDecision{
 const mode=request.mode||'auto';
 const artDirection=businessArtDirection(request.industry,request.businessName);
 const key=artDirection.key;
 const warnings:string[]=[];
 const chosen=mode==='library'&&request.patternId
  ? DESIGN_PATTERNS.find(pattern=>pattern.id===request.patternId)
  : [...DESIGN_PATTERNS].sort((a,b)=>{
    const score=(p:DesignPattern)=>p.industries.includes(key)?10:p.id==='adaptive-general'?1:0;
    return score(b)-score(a);
   })[0];
 if(!chosen)throw new Error('Unknown design pattern; choose a registered pattern');
 const requested=request.immersive3d===true;
 const immersive3d=requested&&chosen.immersive!=='none';
 if(requested&&!immersive3d)warnings.push('Immersive 3D disabled for this design pattern; accessible standard navigation remains available');
 if(request.sourceDesign?.warnings.length)warnings.push('Source website extraction contains limitations; verify preservation before publishing');
 if(mode==='library'&&!request.patternId)warnings.push('No library pattern selected; using an adaptive suggestion');
 return {patternId:chosen.id,mode,artDirection,immersive3d,motion:chosen.motion,sourcePreservation:Boolean(request.sourceDesign),warnings};
}
