import {ExperienceSchema,type Experience} from './experiences';
import {escapeHtml} from './export';
export type ExperienceIssue={severity:'error'|'warning';message:string};
export function reviewExperience(input:unknown):{passed:boolean;issues:ExperienceIssue[]}{
 const parsed=ExperienceSchema.safeParse(input);
 if(!parsed.success)return {passed:false,issues:[{severity:'error',message:'Experience failed schema validation'}]};
 const e=parsed.data,issues:ExperienceIssue[]=[];
 if(e.hero.headline.trim().length<12)issues.push({severity:'warning',message:'Headline is too short to communicate a strong value proposition'});
 if(e.hero.description.trim().length<60)issues.push({severity:'warning',message:'Hero description needs more business context'});
 if(e.sections.length<2)issues.push({severity:'warning',message:'Add at least two content sections'});
 if(e.category==='business'&&!e.sections.some(s=>/service|contact|about/i.test(s.title)))issues.push({severity:'warning',message:'Add service and contact information for business websites'});
 if(e.scene.object==='product-image'&&!e.scene.imageUrl&&!e.scene.modelUrl)issues.push({severity:'error',message:'Product image requires an asset URL'});
 return {passed:!issues.some(i=>i.severity==='error'),issues};
}
export function renderExperienceHtml(e:Experience){
 const safe=ExperienceSchema.parse(e),s=escapeHtml;
 const publicModel=safe.scene.modelUrl?.startsWith('https://')?safe.scene.modelUrl:null;
 const publicImage=!publicModel&&safe.scene.object==='product-image'&&safe.scene.imageUrl?.startsWith('https://')?safe.scene.imageUrl:null;
 const image=publicImage?'<img src="'+s(publicImage)+'" alt="'+s(safe.name)+' product image" loading="lazy" style="max-width:100%;height:auto;display:block;margin:24px auto;max-height:65vh">':'';
 const model=publicModel?'<model-viewer src="'+s(publicModel)+'" alt="Interactive 3D product model" camera-controls auto-rotate shadow-intensity="1" exposure="1" style="width:100%;height:clamp(320px,60vh,650px);background:transparent"></model-viewer>':'';
 const modelScript=publicModel?'<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js"></script>':'';
 const sections=safe.sections.map(x=>'<section id="'+s(x.id)+'"><h2>'+s(x.title)+'</h2><p>'+s(x.body)+'</p></section>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+s(safe.name)+'</title><meta name="description" content="'+s(safe.hero.description)+'"><style>*{box-sizing:border-box}body{margin:0;background:'+safe.scene.background+';color:#fff;font-family:system-ui,sans-serif}nav{padding:28px 7%;letter-spacing:.2em;border-bottom:1px solid #ffffff22}main{padding:120px 8%;min-height:80vh;background:radial-gradient(circle at 75% 40%,'+safe.scene.accent+'44,transparent 50%)}small{letter-spacing:.25em;color:#ddd}h1{font-size:clamp(3.5rem,9vw,9rem);line-height:.95;letter-spacing:-.07em;max-width:950px}p{line-height:1.8;color:#ddd;max-width:650px}a{display:inline-block;color:#fff;border:1px solid #fff;padding:15px 26px;border-radius:30px;text-decoration:none}section{padding:100px 10%;border-top:1px solid #ffffff22}section h2{font-size:clamp(2rem,5vw,5rem)}footer{padding:40px;text-align:center;color:#aaa}</style>'+modelScript+'</head><body><nav>'+s(safe.name)+'</nav><main><small>'+s(safe.hero.eyebrow)+'</small><h1>'+s(safe.hero.headline)+'</h1><p>'+s(safe.hero.description)+'</p>'+model+image+'<a href="#story">'+s(safe.hero.cta)+'</a></main>'+sections+'<footer>CREATED WITH FORGE STUDIO</footer></body></html>';
}
