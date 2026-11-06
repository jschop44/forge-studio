import {z} from 'zod';
const Input=z.object({html:z.string().min(1).max(250000),url:z.string().url().optional()});
export type SiteAudit={score:number;technicalScore:number;visualHeuristic:number;seo:number;aeo:number;geo:number;accessibility:number;conversion:number;findings:{category:string;severity:'high'|'medium'|'low';message:string;recommendation:string}[]};
export function auditGeneratedSite(input:unknown):SiteAudit{
 const {html}=Input.parse(input),findings:SiteAudit['findings']=[],has=(re:RegExp)=>re.test(html);
 const dimensions={seo:100,aeo:100,geo:100,accessibility:100,conversion:100};
 function flag(key:keyof typeof dimensions,penalty:number,message:string,recommendation:string){dimensions[key]=Math.max(0,dimensions[key]-penalty);findings.push({category:key,severity:penalty>=25?'high':penalty>=15?'medium':'low',message,recommendation})}
 if(!has(/<title>[^<]{8,}/i))flag('seo',30,'Missing meaningful page title','Write a descriptive title for each page');
 if(!has(/name=["']description["']/i))flag('seo',20,'No meta description','Add a concise page summary');
 if(!has(/<h1\b/i))flag('seo',20,'Missing main heading','Add one descriptive H1');
 if(!has(/rel=["']canonical["']/i))flag('seo',10,'Canonical URL not configured','Set a canonical URL on published pages');
 if(!has(/application\/ld\+json/i))flag('geo',30,'Structured data missing','Add Organization or LocalBusiness JSON-LD');
 if(!has(/<h2\b/i))flag('aeo',15,'No secondary headings','Use answer-oriented headings');
 if(!has(/<p\b/i))flag('aeo',20,'No explanatory copy','Explain services and benefits in plain language');
 if(!has(/\b(service|product|solution|offer)\b/i))flag('geo',15,'Offerings are unclear','Describe specific services or products');
 if(!has(/<html[^>]*lang=/i))flag('accessibility',20,'Document language missing','Set the html lang attribute');
 if(!has(/name=["']viewport["']/i))flag('accessibility',20,'Responsive viewport missing','Add mobile viewport metadata');
 if(has(/<img\b(?![^>]*\balt=)/i))flag('accessibility',25,'Image without alternative text','Add meaningful alt text');
 if(!has(/<a\b|<button\b/i))flag('conversion',25,'No clear next action','Add an accessible call to action');
 if(!has(/contact|mailto:|form/i))flag('conversion',25,'No contact path','Provide a contact method or lead form');
 const technicalScore=Math.round(Object.values(dimensions).reduce((a,b)=>a+b,0)/5);
 // Structural visual checks only: these cannot establish photographic relevance or aesthetic quality.
 let visualHeuristic=100;
 if(!has(/<img\b|background-image\s*:|url\(["']?https?:/i))visualHeuristic-=30;
 if(!has(/@media\s*\(|clamp\s*\(|grid-template-columns|flex-wrap/i))visualHeuristic-=25;
 if(!has(/<section\b|<article\b|class=["'][^"']*(?:card|feature|hero)/i))visualHeuristic-=20;
 if(!has(/prefers-reduced-motion/i))visualHeuristic-=10;
 if(!has(/font-family\s*:|font\s*:/i))visualHeuristic-=15;
 visualHeuristic=Math.max(0,visualHeuristic);
 const score=Math.round(technicalScore*.7+visualHeuristic*.3);
 return {score,technicalScore,visualHeuristic,...dimensions,findings};
}

export function explainDiscoverability(audit:SiteAudit){
 return {
 seo:audit.seo>=85?'SEO foundations are strong in the supplied markup; verify indexing, content relevance and real performance.':'SEO needs work: improve titles, descriptions, headings and canonical information before launch.',
 aeo:audit.aeo>=85?'AEO structure includes readable answers and headings; validate that it answers real customer questions.':'AEO needs clear question-led sections, direct answers and useful descriptions of services.',
 geo:audit.geo>=85?'GEO foundations include structured information; AI citations and recommendations cannot be guaranteed.':'GEO needs accurate structured data, clear business offerings and trustworthy, verifiable information.',
 visual:'Visual score is a markup-based heuristic only. It cannot judge image relevance, brand quality, visual appeal or 3D immersion.'
 };
}
