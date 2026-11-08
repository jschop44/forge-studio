export type WebsiteExperience='standard'|'cinematic'|'object-navigation';
export type ObjectNavigationPlan={theme:'coffee'|'baseball';targets:{part:string;label:string;href:string}[]};
/** Explicit industry and supplied offerings determine objects; incidental prose cannot switch niches. */
export function objectNavigationPlan(input:{industry:string;services:string[];pagePurpose?:'general'|'food'}):ObjectNavigationPlan|null{
 const coffeeIndustry=/\b(coffee|caf[eé]|espresso|roaster|roastery)\b/i.test(input.industry);
 const baseballIndustry=/\b(baseball|softball)\b/i.test(input.industry)||(/\b(sports|sporting goods)\b/i.test(input.industry)&&input.services.some(s=>/\b(baseball|softball|bats?|gloves?)\b/i.test(s)));
 const foodCoffee=input.pagePurpose==='food'&&input.services.some(s=>/\b(coffee|espresso|beans)\b/i.test(s));
 const theme=coffeeIndustry||foodCoffee?'coffee':baseballIndustry?'baseball':null;
 if(!theme)return null;
 const rules=theme==='coffee'?[{part:'handle',match:/\b(cups?|mugs?|drinkware|ceramics?)\b/i},{part:'coffee',match:/\b(beans?|roasts?|coffee|espresso)\b/i}]:[{part:'bat',match:/\b(bats?|batting)\b/i},{part:'ball',match:/\b(baseballs?|softballs?|balls?)\b/i},{part:'glove',match:/\b(gloves?|mitts?)\b/i}];
 const targets=rules.flatMap(rule=>{const index=input.services.findIndex(service=>rule.match.test(service));return index<0?[]:[{part:rule.part,label:input.services[index],href:'services.html#offering-'+index}]});
 return targets.length?{theme,targets}:null;
}
