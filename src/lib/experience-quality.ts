import {ExperienceSchema,type Experience} from './experiences';
import {escapeHtml} from './export';
export type ExperienceIssue={severity:'error'|'warning';message:string};
/** A CTA must navigate to an existing section, never an invented #story anchor. */
export function experienceCtaTarget(experience:Pick<Experience,'sections'|'hero'>):string|null{
 if(!experience.hero.cta.trim()||!experience.sections.length)return null;
 const ids=experience.sections.map(section=>section.id);
 if(ids.some(id=>!/^([a-z][a-z0-9-]{0,63})$/.test(id))||new Set(ids).size!==ids.length)return null;
 const wantsContact=/\b(contact|touch|book|call|appointment|reserve|reservation)\b/i.test(experience.hero.cta);
 const match=wantsContact?experience.sections.find(section=>/\b(contact|booking|appointment|reservation)\b/i.test(section.title+' '+section.id)):undefined;
 return (match||experience.sections[0]).id;
}
export function reviewExperience(input:unknown):{passed:boolean;issues:ExperienceIssue[]}{
 const parsed=ExperienceSchema.safeParse(input);
 if(!parsed.success)return {passed:false,issues:[{severity:'error',message:'Experience failed schema validation'}]};
 const e=parsed.data,issues:ExperienceIssue[]=[];
 if(e.hero.headline.trim().length<12)issues.push({severity:'warning',message:'Headline is too short to communicate a strong value proposition'});
 if(e.hero.description.trim().length<60)issues.push({severity:'warning',message:'Hero description needs more business context'});
 if(e.sections.length<2)issues.push({severity:'warning',message:'Add at least two content sections'});
 if(e.category==='business'&&!e.sections.some(s=>/service|contact|about/i.test(s.title)))issues.push({severity:'warning',message:'Add service and contact information for business websites'});
 if(e.scene.object==='product-image'&&!e.scene.imageUrl&&!e.scene.modelUrl)issues.push({severity:'error',message:'Product image requires an asset URL'});
 if(e.hero.cta.trim()&&experienceCtaTarget(e)===null)issues.push({severity:'error',message:'The call to action needs at least one destination section'});
 if(e.hero.cta.trim()&&/\b(contact|touch|book|call|appointment)\b/i.test(e.hero.cta)&&!e.sections.some(section=>/\b(contact|booking|appointment|reservation)\b/i.test(section.title+' '+section.id)))issues.push({severity:'warning',message:'Contact-oriented call to action has no matching contact section'});
 const ids=e.sections.map(section=>section.id);
 if(ids.some(id=>!/^([a-z][a-z0-9-]{0,63})$/.test(id))||new Set(ids).size!==ids.length)
  issues.push({severity:'error',message:'Section destinations must have unique, safe IDs'});

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
 const destination=experienceCtaTarget(safe);
 const cta=destination?'<a class="experience-cta" href="#'+s(destination)+'">'+s(safe.hero.cta)+'</a>':'';

 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+s(safe.name)+'</title><meta name="description" content="'+s(safe.hero.description)+'"><style>*{box-sizing:border-box}body{margin:0;background:'+safe.scene.background+';color:#fff;font-family:system-ui,sans-serif}nav{padding:28px 7%;letter-spacing:.2em;border-bottom:1px solid #ffffff22}main{padding:clamp(72px,10vw,120px) clamp(20px,8vw,110px);min-height:80vh;background:radial-gradient(circle at 75% 40%,'+safe.scene.accent+'44,transparent 50%)}small{letter-spacing:.25em;color:#ddd}h1{font-size:clamp(2.35rem,8vw,8rem);line-height:1.03;letter-spacing:-.055em;max-width:950px;overflow-wrap:anywhere}p{line-height:1.8;color:#ddd;max-width:650px}a{display:inline-flex;align-items:center;min-height:44px;max-width:100%;overflow-wrap:anywhere;color:#fff;border:1px solid #fff;padding:15px 26px;border-radius:30px;text-decoration:none}a:focus-visible{outline:3px solid #fff;outline-offset:4px}section{padding:clamp(48px,8vw,100px) clamp(20px,8vw,110px);border-top:1px solid #ffffff22;overflow-wrap:anywhere}section h2{font-size:clamp(2rem,5vw,5rem)}footer{padding:40px;text-align:center;color:#aaa}</style>'+modelScript+'</head><body><nav>'+s(safe.name)+'</nav><main><small>'+s(safe.hero.eyebrow)+'</small><h1>'+s(safe.hero.headline)+'</h1><p>'+s(safe.hero.description)+'</p>'+model+image+cta+'</main>'+sections+'<footer>CREATED WITH FORGE STUDIO</footer></body></html>';
}
