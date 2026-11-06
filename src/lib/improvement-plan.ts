import {auditGeneratedSite} from './site-audit';
import {generateBusinessWebsite} from './business-site';
export type Improvement={id:string;title:string;why:string;steps:string[];impact:string;selected:boolean};
export function createImprovementPlan(input:{businessName:string;industry:string;description:string;services:string[];websiteHtml?:string}){
 const draft=generateBusinessWebsite(input);
 const review=auditGeneratedSite({html:input.websiteHtml||draft.pages[0].html});
 const improvements:Improvement[]=[
 {id:'relevance',title:'Match every image and interaction to the business',why:'Generic images undermine trust and confuse visitors.',steps:['Confirm the business category and main products.','Replace unrelated visuals with category-specific photography.','Use an industry-relevant interactive experience in the home page.'],impact:'Improved clarity and engagement',selected:true},
 {id:'conversion',title:'Make the primary customer action obvious',why:'Visitors need a clear next step to become customers.',steps:['Choose one primary action such as book, order, call or request a quote.','Place the action above the fold.','Repeat the action after key service sections.'],impact:'Potentially more qualified inquiries',selected:true},
 {id:'content',title:'Explain products and services clearly',why:'Specific offerings help customers and search engines understand the business.',steps:['List actual offerings and benefits.','Add concise answers to common customer questions.','Check all claims against business-provided facts.'],impact:'Better usability and search relevance',selected:true},
 {id:'mobile',title:'Optimize the mobile customer journey',why:'Small screens must remain legible and easy to navigate.',steps:['Review the hero at phone width.','Ensure text and buttons are readable and tappable.','Test navigation and contact actions on a real phone.'],impact:'Lower friction for mobile visitors',selected:true},
 {id:'seo',title:'Strengthen SEO, AEO and GEO foundations',why:'Structured information helps search engines and AI systems interpret pages.',steps:['Write unique titles and descriptions.','Add accurate organization and service schema.','Include helpful question-and-answer sections with verified facts.'],impact:'Improved discoverability foundations, not guaranteed rankings',selected:true},
 {id:'contact',title:'Add a real contact and lead capture path',why:'A website cannot convert reliably without a working contact channel.',steps:['Supply a verified business email or approved form endpoint.','Test successful delivery of an inquiry.','Add privacy disclosures and consent where needed.'],impact:'A working path for new inquiries',selected:true}
 ];
 return {review,improvements};
}
