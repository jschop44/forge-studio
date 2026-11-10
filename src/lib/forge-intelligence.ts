import type {SourceImage} from './website-design-dna';
export type SiteEvidence={url:string;title:string;description:string;headings:string[];navigation?:{label:string;path:string}[];pageSummaries?:{path:string;label:string;title:string;description:string;headings:string[];paragraphs?:string[];images?:SourceImage[]}[]};
export type InspectionCoverage={metadata:boolean;navigation:boolean;internalPages:number;visualCapture:boolean;limitations:string[]};
export function inspectionCoverage(input:SiteEvidence):InspectionCoverage{
 const limitations:string[]=[];
 if(!(input.navigation||[]).length)limitations.push('No internal navigation paths discovered');
 if(!(input.pageSummaries||[]).length)limitations.push('No internal pages successfully inspected');
 limitations.push('Rendered screenshots and browser interactions not yet inspected');
 return {metadata:Boolean(input.title||input.description),navigation:Boolean(input.navigation?.length),internalPages:input.pageSummaries?.length||0,visualCapture:false,limitations};
}
export type IntelligenceFinding={industry:string;confidence:'high'|'medium'|'low';signals:string[];services:string[];sourcePages:number};
const categories=[
 {industry:'Entertainment, media and theme parks',pattern:/theme parks?|entertainment|movies?|films?|streaming|characters|cinema|television|resorts? and parks?/i,services:['Entertainment','Destinations','Stories']},
 {industry:'Coffee shop and cafe',pattern:/coffee|espresso|barista|café|cafe|roaster/i,services:['Coffee menu','Visit our cafe','Contact']},
 {industry:'Restaurant and hospitality',pattern:/restaurant|pizza|bakery|dining|menu|food service/i,services:['Menu','Visit us','Contact']},
 {industry:'Real estate',pattern:/real estate|realtor|property listings|homes for sale/i,services:['Properties','Our team','Contact']},
 {industry:'Health and wellness',pattern:/fitness|wellness|gym|yoga|spa|personal training/i,services:['Programs','Membership','Contact']},
 {industry:'Automotive',pattern:/automotive|car dealership|vehicles|auto repair/i,services:['Vehicles','Services','Contact']},
 {industry:'Fashion and luxury',pattern:/fashion|jewelry|clothing|apparel|luxury goods/i,services:['Collections','About','Contact']},
 {industry:'Technology',pattern:/software|technology|cloud computing|saas|digital platform/i,services:['Solutions','Products','Contact']},
 {industry:'Sporting goods retail',pattern:/baseball|softball|sporting goods|sports equipment|baseball bats?|baseball gloves?|batting cages?/i,services:['Shop equipment','Product categories','Contact']},
 {industry:'Healthcare and medical services',pattern:/\bhospitals?\b|medical clinic|healthcare|physician|doctor|pediatric|dental|dentist|physical therapy|urgent care/i,services:['Care services','Patient information','Contact']},
 {industry:'Pharmacy',pattern:/pharmacy|pharmacist|prescriptions?|medication refill/i,services:['Pharmacy services','Refill information','Contact']},
 {industry:'Education and tutoring',pattern:/school|tutoring|education|learning center|training academy|lessons/i,services:['Programs','Enrollment information','Contact']},
 {industry:'Home and trade services',pattern:/plumbing|electrician|roofing|landscaping|hvac|heating and cooling|home renovation|contractor/i,services:['Our services','Request an estimate','Contact']},
 {industry:'Legal services',pattern:/law firm|attorney|legal services|lawyer|litigation/i,services:['Practice areas','Our team','Contact']},
 {industry:'Financial services',pattern:/accounting|bookkeeping|financial advisor|tax preparation|insurance agency|wealth management/i,services:['Financial services','About our team','Contact']},
 {industry:'Beauty and personal care',pattern:/hair salon|barbershop|nail salon|beauty studio|skincare|cosmetology/i,services:['Services','Appointments','Contact']},
 {industry:'Arts and creative services',pattern:/photography|photographer|design studio|art gallery|creative agency|videography/i,services:['Portfolio','Services','Contact']},
 {industry:'Pet and animal care',pattern:/veterinar|pet grooming|dog daycare|pet boarding|animal hospital/i,services:['Pet care','Appointments','Contact']},
 {industry:'Events and seasonal attractions',pattern:/halloween|pumpkin patch|holiday event|festival|seasonal attraction|family entertainment/i,services:['Activities','Visitor information','Contact']}
];
export function analyzeSiteEvidence(input:SiteEvidence):IntelligenceFinding{
 const primary=[input.title,input.description,...input.headings].join(' ');
 const secondary=[input.url,...(input.pageSummaries||[]).flatMap(p=>[p.title,p.description,...p.headings]),...(input.navigation||[]).map(p=>p.label)].join(' ');
 const animalCare=/animal hospital|veterinar|pet clinic/i.test(primary);
 const scored=categories.map(category=>({category,score:animalCare&&category.industry==='Healthcare and medical services'?0:(primary.match(new RegExp(category.pattern.source,'gi'))||[]).length*2+(secondary.match(new RegExp(category.pattern.source,'gi'))||[]).length}));
 scored.sort((a,b)=>b.score-a.score);
 const winner=scored[0];
 const runnerUp=scored[1]?.score||0;
 // A strong but ambiguous keyword match is not reliable high-confidence evidence.
 const confidence=winner.score>=6&&winner.score>=runnerUp*2?'high':winner.score>=2&&winner.score>runnerUp?'medium':'low';
 const industry=winner.score>0?winner.category.industry:'General business';
 const signals=[input.title?'page title':'',input.description?'meta description':'',input.navigation?.length?'navigation':'',input.pageSummaries?.length?'internal pages':''].filter(Boolean);
 const headings=[...input.headings,...(input.pageSummaries||[]).flatMap(p=>p.headings)].map(h=>h.trim()).filter(h=>h.length>=5&&h.length<=65&&!/^(home|about|contact|welcome|menu|explore|learn more)$/i.test(h));
 const services=[...new Set(headings)].slice(0,3);
 return {industry,confidence,signals,services:services.length>=2?services:winner.score>0?winner.category.services:['Explore','About','Contact'],sourcePages:1+(input.pageSummaries?.length||0)};
}
