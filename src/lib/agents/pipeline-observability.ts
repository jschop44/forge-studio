/** Tenant-owned database facts only. Counts do not prove live end-to-end
 * handoffs, real browser interactions, external delivery or publication.
 */
export const agentStages=['lead-enrichment','website-audit','site-plan','site-generation','quality-review','publish-review'] as const;
export type AgentStageName=typeof agentStages[number];
type StageCountKey='pending'|'evaluating'|'completed'|'needsApproval'|'blocked';
export type DurableStageSummary={kind:AgentStageName;pending:number;evaluating:number;completed:number;needsApproval:number;blocked:number;latestAt:string|null};
const statusKeys:Record<string,StageCountKey>={
 pending:'pending',evaluating:'evaluating',completed:'completed','needs-approval':'needsApproval',blocked:'blocked'
};
export function summarizeDurableStages(rows:unknown):{scope:'tenant-job-records';stages:DurableStageSummary[]}{
 const stages=agentStages.map(kind=>({kind,pending:0,evaluating:0,completed:0,needsApproval:0,blocked:0,latestAt:null as string|null}));
 if(!Array.isArray(rows))return {scope:'tenant-job-records',stages};
 for(const raw of rows){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const row=raw as Record<string,unknown>;
  const stage=stages.find(item=>item.kind===row.kind);
  const key=typeof row.status==='string'?statusKeys[row.status]:undefined;
  const amount=typeof row.total==='string'||typeof row.total==='number'?Number(row.total):NaN;
  if(!stage||!key||!Number.isSafeInteger(amount)||amount<0)continue;
  stage[key]+=amount;
  if(row.last_updated!==undefined&&row.last_updated!==null){
   const parsed=row.last_updated instanceof Date?row.last_updated:new Date(String(row.last_updated));
   if(!Number.isNaN(parsed.getTime())){
    const latest=parsed.toISOString();
    if(!stage.latestAt||latest>stage.latestAt)stage.latestAt=latest;
   }
  }
 }
 return {scope:'tenant-job-records',stages};
}
