export type SiteEvidence={url:string;title:string;description:string;headings:string[];navigation?:{label:string;path:string}[];pageSummaries?:{path:string;label:string;title:string;description:string;headings:string[]}[]};
export type IntelligenceFinding={industry:string;confidence:'high'|'medium'|'low';signals:string[];services:string[];sourcePages:number};
const categories=[
 {industry:'Entertainment, media and theme parks',pattern:/theme parks?|entertainment|movies?|films?|streaming|characters|cinema|television|resorts? and parks?/i,services:['Entertainment','Destinations','Stories']},
 {industry:'Coffee shop and cafe',pattern:/coffee|espresso|barista|café|cafe|roaster/i,services:['Coffee menu','Visit our cafe','Contact']},
 {industry:'Restaurant and hospitality',pattern:/restaurant|pizza|bakery|dining|menu|food service/i,services:['Menu','Visit us','Contact']},
 {industry:'Real estate',pattern:/real estate|realtor|property listings|homes for sale/i,services:['Properties','Our team','Contact']},
 {industry:'Health and wellness',pattern:/fitness|wellness|gym|yoga|spa|personal training/i,services:['Programs','Membership','Contact']},
 {industry:'Automotive',pattern:/automotive|car dealership|vehicles|auto repair/i,services:['Vehicles','Services','Contact']},
 {industry:'Fashion and luxury',pattern:/fashion|jewelry|clothing|apparel|luxury goods/i,services:['Collections','About','Contact']},
 {industry:'Technology',pattern:/software|technology|cloud computing|saas|digital platform/i,services:['Solutions','Products','Contact']}
];
export function analyzeSiteEvidence(input:SiteEvidence):IntelligenceFinding{
 const primary=[input.title,input.description,...input.headings].join(' ');
 const secondary=[input.url,...(input.pageSummaries||[]).flatMap(p=>[p.title,p.description,...p.headings]),...(input.navigation||[]).map(p=>p.label)].join(' ');
 const scored=categories.map(category=>({category,score:(primary.match(new RegExp(category.pattern.source,'gi'))||[]).length*2+(secondary.match(new RegExp(category.pattern.source,'gi'))||[]).length}));
 scored.sort((a,b)=>b.score-a.score);
 const winner=scored[0];
 const confidence=winner.score>=6?'high':winner.score>=2?'medium':'low';
 const industry=winner.score>0?winner.category.industry:'General business';
 const signals=[input.title?'page title':'',input.description?'meta description':'',input.navigation?.length?'navigation':'',input.pageSummaries?.length?'internal pages':''].filter(Boolean);
 const headings=[...input.headings,...(input.pageSummaries||[]).flatMap(p=>p.headings)].map(h=>h.trim()).filter(h=>h.length>=5&&h.length<=65&&!/^(home|about|contact|welcome|menu|explore|learn more)$/i.test(h));
 const services=[...new Set(headings)].slice(0,3);
 return {industry,confidence,signals,services:services.length>=2?services:winner.score>0?winner.category.services:['Explore','About','Contact'],sourcePages:1+(input.pageSummaries?.length||0)};
}
