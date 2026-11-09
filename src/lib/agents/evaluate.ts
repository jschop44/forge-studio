import {prepareAgentAudit,AuditSourceError} from '../server/agent-audit-source';
import {AgentTaskSchema} from './types';
import {planNextTask} from './orchestrator';
import {executeAgent} from './execution';
import {reviewAgentPages} from './quality';
import type {AgentTask} from './types';

/** Scope reuse to one evaluation: never reuse evidence across jobs or edited pages. */
export async function evaluateAgentTask(task:AgentTask,review=reviewAgentPages,execute=executeAgent,prepare=prepareAgentAudit){
 task=AgentTaskSchema.parse(task);
 try{task=await prepare(task)}catch(error){
  if(error instanceof AuditSourceError&&error.retryable)throw Error('AUDIT_SOURCE_TRANSIENT');
  return {task,decision:{taskId:task.id,status:'blocked' as const,reason:error instanceof AuditSourceError?error.message:'Website evidence could not be retrieved safely; supply permitted HTML or retry later'},output:null};
 }
 let evidence:ReturnType<typeof reviewAgentPages>|undefined;
 const once=(payload:Record<string,unknown>)=>evidence??(evidence=review(payload));
 const decision=planNextTask(task,once);
 const output=decision.status==='ready'?await execute(task,undefined,once):null;
 return {task,decision,output};
}
