import {inferBusinessIndustry} from './website-experience';

/** Recognize the inline field format shown by the generator without splitting list separators. */
export function normalizeBusinessBrief(brief:string):string{
 return brief.replace(/;[ \t]*(?=(?:industry|business type|category|services|products|offerings|menu)\s*:)/gi,'\n');
}

export type Brief={businessName:string;industry:string;description:string;services:string[];contactEmail?:string};
export function inferBusinessBrief(name:string,brief:string):Brief{
 brief=normalizeBusinessBrief(brief);
 const declaredIndustry=brief.match(/(?:^|\n)\s*(?:industry|business type|category)\s*:\s*([^\n]{2,80})/i)?.[1]?.trim();
 const industry=declaredIndustry||inferBusinessIndustry(name,brief);
 const copy=brief.split('\n').filter(line=>!/^\s*(?:industry|business type|category|services|products|offerings|menu)\s*:/i.test(line)).join(' ').trim();
 const description=copy.length>=15?copy:brief.trim().length>=15?name+' offers '+(brief.match(/(?:services|products|offerings|menu)\s*:\s*([^\n]+)/i)?.[1]||industry.toLowerCase())+'.':'Explore what '+name+' offers and find the information you need for your next step.';
 const serviceLine=brief.split('\n').find(line=>/^(services|products|offerings|menu)\s*:/i.test(line.trim()));
 const listed=serviceLine?serviceLine.replace(/^[^:]+:/,'').split(/[,;]/).map(part=>part.trim()).filter(part=>part.length>=3&&part.length<=65).slice(0,12):[];

 const services=listed.length>=1?listed:/soccer|association football/.test(industry)&&/memorabilia|collectibl|retail|shop|store|equipment|merchandise/.test(industry)?['Browse soccer memorabilia','Explore soccer equipment','Ask about availability']:/soccer|football club/.test(industry)?['Soccer training','Teamwear and equipment','Match information']:declaredIndustry?normalizeBusinessOfferings(industry,[]) :/disney|theme park|entertainment|movies|characters|streaming/.test(industry)?['Explore entertainment','Discover destinations','Browse stories']:/coffee|espresso|roast|barista|café|cafe/.test(industry)?['Coffee menu','Visit our café','Contact the team']:/baseball|softball|batting|sports? equipment|sporting goods|baseball bat|baseball glove/.test(industry)?['Shop baseball equipment','Explore bats and gloves','Contact the store']:/restaurant|pizza|food|bakery/.test(industry)?['Explore the menu','Visit us','Ask a question']:/real estate|realtor|property/.test(industry)?['Explore properties','Discuss your goals','Contact an agent']:/gym|fitness|wellness|spa/.test(industry)?['Explore programs','Ask about availability','Contact the team']:/\bhospitals?\b|healthcare|medical|clinic/.test(industry)?['Care services','Patient information','Contact the team']:['Explore services','Discuss your project','Contact the team'];
 return {businessName:name.trim(),industry,description,services:normalizeBusinessOfferings(industry,services)};
}

/** Navigation actions are not products or services. Keep actual stated offering names. */
export function normalizeBusinessOfferings(industry:string,offerings:string[]):string[]{
 const seen=new Set<string>();const result=offerings.flatMap(value=>{
  const original=value.trim().replace(/\s+/g,' ');
  if(original.toLowerCase()==='explore '+industry.toLowerCase()+' offerings')return [];
  if(/^(?:(?:explore|browse|view|shop|discover)(?: our| all)? (?:services|products|offerings|selection|collection)|about(?: us| our business)?|contact(?: us| the (?:team|store)| our team)?|ask (?:a question|about availability)|discuss (?:your|their|a) projects?|visit (?:us|our caf[eé]))[.!?→]*$/i.test(original))return [];
  const name=original.replace(/^(?:explore|browse|shop|discover|view)(?: our)?\s+/i,'').trim();
  const key=name.toLowerCase();if(!name||seen.has(key))return [];seen.add(key);return [name];
 });
 if(result.length)return result;
 const subject=industry.replace(/\b(?:retail|wholesale|business|shop|store)\b/gi,'').replace(/\s+/g,' ').trim();
 return [/^toys?$/i.test(subject)?'Toys':subject?subject.charAt(0).toUpperCase()+subject.slice(1):'Offerings'];
}
