import assert from 'node:assert/strict';
import {evaluateAgentTask} from '../src/lib/agents/evaluate';
import {executeAgent} from '../src/lib/agents/execution';
import {planNextTask} from '../src/lib/agents/orchestrator';
import {nextAgentStage} from '../src/lib/agents/handoff';
import type {AgentTask} from '../src/lib/agents/types';
import {DesignSchema,compositionAppearance} from '../src/lib/ai-composition';
import type {AiGenerationResult} from '../src/lib/server/local-ai';

// Synthetic, non-persistent regression fixture. Never queues or publishes a real user site.
async function main(){
const origin='https://forge-studio-preview.stands-old-3h.workers.dev';
let task:AgentTask={id:crypto.randomUUID(),tenantId:crypto.randomUUID(),kind:'site-plan',source:'forge-studio',attempt:0,createdAt:new Date().toISOString(),payload:{businessName:'Forge Pipeline Verification Studio',industry:'Design',summary:'An independent studio providing website design services for local businesses.',services:['Website design','Accessibility review']}};
// Read only this app's public diagnostic homepage; never queue or publish a real site.
const lead={...task,kind:'lead-enrichment',payload:{...task.payload,website:origin}} as AgentTask;
const enriched=await evaluateAgentTask(lead);
assert.equal(enriched.decision.next,'website-audit');
assert.ok(enriched.output);
const auditStage=nextAgentStage(lead,enriched.decision,enriched.output)!;
const audited=await evaluateAgentTask({...lead,...auditStage});
assert.equal(audited.decision.next,'site-plan',audited.decision.reason);
assert.ok(audited.output?.data.audit);
assert.equal(typeof audited.task.payload.html,'string');
const planned=nextAgentStage(audited.task,audited.decision,audited.output)!;
task={...task,...planned};
const planDecision=planNextTask(task);
const plan=await executeAgent(task);
const generation=nextAgentStage(task,planDecision,plan)!;
assert.equal(generation.payload.approvedPlan,false);
const unapproved={...task,...generation,kind:'site-generation'} as AgentTask;
assert.equal(planNextTask(unapproved).status,'needs-approval');
// Approval applies only to this isolated test fixture; nothing is persisted.
const approved={...unapproved,payload:{...unapproved.payload,approvedPlan:true}};
const draft=await executeAgent(approved,async input=>{
 const response=await fetch(origin+'/api/ai/business',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(input),signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Live model request failed with HTTP '+response.status);
 const result=await response.json() as AiGenerationResult;
 assert.equal(result.provider,'cloudflare');
 assert.equal(result.draft.businessName,input.businessName);
 assert.equal(result.draft.industry,input.industry);
 assert.deepEqual(result.draft.services,input.services);
 const design=DesignSchema.parse(result.draft.design);
 const appearance=compositionAppearance(design);
 assert.ok(result.pages.every(page=>page.html.includes('data-forge-layout="'+appearance.layout+'"')));
 assert.ok(result.pages[0].html.includes(appearance.accent));
 return result;
});
const qualityStage=nextAgentStage(approved,planNextTask(approved),draft)!;
const qualityTask={...task,...qualityStage} as AgentTask;
const {decision:qualityDecision,output:quality}=await evaluateAgentTask(qualityTask);
assert.equal(qualityDecision.status,'ready',qualityDecision.reason);
assert.ok(quality);
assert.equal((quality.data.audits as unknown[]).length,4);
const publication=nextAgentStage(qualityTask,qualityDecision,quality)!;
const published=await evaluateAgentTask({...task,...publication});
assert.equal(published.decision.status,'needs-approval');
assert.equal(published.output,null);
console.log(JSON.stringify({stagesVerified:6,evidenceStages:'permitted-public-diagnostic-homepage',provider:draft.data.provider,pages:(draft.data.pages as unknown[]).length,composition:'model-selected-layout-and-palette',quality:'passed',publication:'needs-approval',persisted:false,published:false}));

}
main().catch(error=>{console.error(error.message);process.exitCode=1});
