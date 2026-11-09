import {planNextTask} from './orchestrator';
import {executeAgent} from './execution';
import {reviewAgentPages} from './quality';
import type {AgentTask} from './types';

/** Scope reuse to one evaluation: never reuse evidence across jobs or edited pages. */
export async function evaluateAgentTask(task:AgentTask,review=reviewAgentPages,execute=executeAgent){
 let evidence:ReturnType<typeof reviewAgentPages>|undefined;
 const once=(payload:Record<string,unknown>)=>evidence??(evidence=review(payload));
 const decision=planNextTask(task,once);
 const output=decision.status==='ready'?await execute(task,undefined,once):null;
 return {decision,output};
}
