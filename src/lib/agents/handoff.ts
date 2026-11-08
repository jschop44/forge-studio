import type {AgentTask,AgentDecision} from './types';
import type {AgentOutput} from './execution';

/** Shared stage payload used by interactive evaluation and the background worker. */
export function nextAgentStage(task:AgentTask,decision:AgentDecision,output:AgentOutput|null):{id:string;kind:AgentTask['kind'];payload:Record<string,unknown>}|undefined{
 if(decision.status!=='ready'||!decision.next||!output)return undefined;
 return {id:crypto.randomUUID(),kind:decision.next,payload:{
  ...task.payload,previousResult:output.data,
  ...(decision.next==='site-generation'?{approvedPlan:false}:{}),
  ...(decision.next==='quality-review'?{pages:output.data.pages,html:((output.data.pages as {html:string}[]|undefined)?.[0]?.html)||''}:{})
 }};
}
