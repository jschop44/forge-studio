import {z} from 'zod';
import {recordDraftQuality} from '../draft-quality-evidence';
import {auditGeneratedSite} from '../site-audit';

const Page=z.object({slug:z.string().min(1).max(64),title:z.string().max(200),html:z.string().min(1).max(250000)});
const Pages=z.array(Page).min(1).max(12).refine(pages=>pages.reduce((total,page)=>total+page.html.length,0)<=1000000,'Review content exceeds limit');

/** Review supplied markup only; never implies browser, AI, or deployment verification. */
export function reviewAgentPages(payload:Record<string,unknown>){
 const pages=Pages.parse(payload.pages===undefined
  ?[{slug:'index',title:'Supplied page',html:payload.html}]
  :payload.pages);
 const evidence=recordDraftQuality(pages);
 const audits=pages.map(page=>({slug:page.slug,audit:auditGeneratedSite({html:page.html})}));
 const errors=[...evidence.errors,...audits.flatMap(({slug,audit})=>audit.findings.filter(f=>f.severity==='high').map(f=>slug+': '+f.message))];
 return {evidence:{...evidence,status:errors.length?'failed' as const:'passed' as const,errors},audits};
}
