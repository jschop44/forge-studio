import {BusinessContextSchema,BusinessContext,siteBriefFromContext} from './contracts';
import {generateDraft,Site} from '../schema';
export function importBusinessContext(payload:unknown):{context:BusinessContext;site:Site}{const context=BusinessContextSchema.parse(payload);const site=generateDraft(context.businessName,siteBriefFromContext(context)||'Build a modern website for '+context.businessName,'ember');return {context,site}}
export function createAuditHandoff(site:Site){return {version:1,source:'forge-studio',businessName:site.name,website:null,siteSnapshot:{name:site.name,tagline:site.tagline,description:site.description,sections:site.sections.map(x=>({title:x.title,body:x.body}))},requestedAction:'audit-preview'} as const}
export function createLeadHandoff(site:Site){return {version:1,source:'forge-studio',businessName:site.name,requestedAction:'lead-research',summary:site.description} as const}
