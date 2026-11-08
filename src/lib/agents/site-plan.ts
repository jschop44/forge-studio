export type PlanningBrief={businessName?:string;industry?:string;summary?:string;services?:string[]};

/** Plan from supplied facts only. No research, inference, or generation is implied. */
export function createSitePlan(input:PlanningBrief){
 const services=[...new Set((input.services||[]).map(value=>value.trim()).filter(Boolean))].slice(0,12);
 const brief={businessName:input.businessName?.trim()||null,industry:input.industry?.trim()||null,description:input.summary?.trim()||null,services};
 const missingInformation=[...(!brief.businessName?['businessName']:[]),...(!brief.industry?['industry']:[]),...(!brief.description?['description']:[]),...(!services.length?['services']:[])];
 return {
  pages:['Home','Services','About','Contact'],industry:brief.industry||'services',
  businessBrief:brief,missingInformation,requiresApproval:true,
  generationMode:'deterministic-draft',externalResearchPerformed:false,
  pagePlans:[
   {slug:'index',purpose:'Introduce the business and direct visitors to its offerings.',suppliedFacts:[brief.businessName,brief.description].filter((value):value is string=>Boolean(value))},
   {slug:'services',purpose:'Explain the supplied services without inventing prices or guarantees.',suppliedFacts:services},
   {slug:'about',purpose:'Describe the business using the supplied description; verify its story before publishing.',suppliedFacts:brief.description?[brief.description]:[]},
   {slug:'contact',purpose:'Provide verified contact details before publishing.',suppliedFacts:[],needsVerification:['contact details']}
  ],
  reviewNotes:missingInformation.length?['Some business facts are missing. Draft generation may use generic placeholders; review before publication.']:['Review supplied business facts before approving generation.']
 };
}
