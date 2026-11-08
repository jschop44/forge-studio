import {generateWithLocalAi} from '../server/local-ai';
import {z} from 'zod';
import {generateBusinessWebsite} from '../business-site';
import {auditGeneratedSite} from '../site-audit';
import type {AgentTask} from './types';
import {reviewAgentPages} from './quality';
import {createSitePlan} from './site-plan';
const Context=z.object({businessName:z.string().min(2).max(100).optional(),industry:z.string().max(80).optional(),summary:z.string().max(1800).optional(),website:z.string().url().optional(),services:z.array(z.string()).optional(),html:z.string().max(250000).optional(),approvedPlan:z.boolean().optional()}).passthrough();
export type AgentOutput={stage:AgentTask['kind'];summary:string;data:Record<string,unknown>};
export function executeSafeAgent(task:AgentTask):AgentOutput{
 const context=Context.parse(task.payload);
 switch(task.kind){
 case 'lead-enrichment':return {stage:task.kind,summary:'Normalized lead context',data:{businessName:context.businessName||'Unknown',website:context.website||null,industry:context.industry||'other',source:task.source}};
 case 'website-audit':return {stage:task.kind,summary:context.html?'Audited supplied HTML':'No HTML supplied; remote crawl not attempted',data:context.html?{audit:auditGeneratedSite({html:context.html})}:{requiresContent:true}};
 case 'site-plan':return {stage:task.kind,summary:'Drafted a four-page website plan',data:createSitePlan(context)};
 case 'site-generation':{
 if(!context.approvedPlan)throw Error('Site plan approval required');
 const result=generateBusinessWebsite({businessName:context.businessName||'New Business',industry:context.industry||'Services',description:context.summary||'Professional services designed to help customers succeed.',services:context.services?.length?context.services:['Consulting','Customer support']});
 return {stage:task.kind,summary:'Generated four-page site draft',data:{name:result.name,pages:result.pages.map(p=>({slug:p.slug,title:p.title,html:p.html}))}};
 }
 case 'quality-review':{const review=reviewAgentPages(task.payload);return {stage:task.kind,summary:'Reviewed '+review.evidence.pageCount+' supplied page(s)',data:review};}
 case 'publish-review':return {stage:task.kind,summary:'Publication requires explicit owner approval',data:{requiresApproval:true}};
 }
}

/** Queue execution requires real model inference for generation; no silent template fallback. */
export async function executeAgent(task:AgentTask,generate=generateWithLocalAi):Promise<AgentOutput>{
 if(task.kind!=='site-generation')return executeSafeAgent(task);
 const context=Context.parse(task.payload);
 if(!context.approvedPlan)throw Error('Site plan approval required');
 const result=await generate({businessName:context.businessName||'New Business',industry:context.industry||'Services',description:context.summary||'Professional services designed to help customers succeed.',services:context.services?.length?context.services:['Consulting','Customer support']});
 return {stage:task.kind,summary:'AI-generated four-page site draft',data:{name:result.draft.businessName,provider:result.provider,draft:result.draft,pages:result.pages.map(page=>({slug:page.slug,title:page.title,html:page.html}))}};
}
