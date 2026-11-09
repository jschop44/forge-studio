import {runtimeValue} from '../../../../lib/server/runtime-env';
import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {database} from '../../../../lib/server/db';
import {evaluateAgentTask} from '../../../../lib/agents/evaluate';
import {type AgentOutput} from '../../../../lib/agents/execution';
import {settleAgentJob} from '../../../../lib/server/agent-job-settlement';
import type {AgentDecision,AgentTask} from '../../../../lib/agents/types';
import {agentRetryDelay} from '../../../../lib/agents/retry';
import {retryAgentJob} from '../../../../lib/server/agent-job-retry';
import {nextAgentStage} from '../../../../lib/agents/handoff';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(runtimeValue('ENABLE_AGENT_QUEUE')!=='true')return NextResponse.json({error:'Worker disabled'},{status:503});
 const secret=runtimeValue('FORGE_WORKER_SECRET')||'',provided=req.headers.get('x-forge-worker-key')||'';
 if(secret.length<32||provided.length!==secret.length||!timingSafeEqual(Buffer.from(secret),Buffer.from(provided)))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const sql=database();await sql`UPDATE forge_jobs SET status='pending',attempt=attempt+1,updated_at=now() WHERE status='evaluating' AND updated_at<now()-interval '15 minutes' AND attempt<max_attempts`;await sql`UPDATE forge_jobs SET status='blocked',last_error='Maximum retry attempts exceeded',updated_at=now() WHERE status='evaluating' AND updated_at<now()-interval '15 minutes' AND attempt>=max_attempts`;const claimed=await sql`UPDATE forge_jobs SET status='evaluating',updated_at=now() WHERE id IN (SELECT id FROM forge_jobs WHERE status='pending' AND available_at<=now() ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id,tenant_id,kind,source,payload,attempt,max_attempts,created_at,updated_at::text AS lease`;
 const results=[];
 for(const job of claimed){
  const task:AgentTask={id:String(job.id),tenantId:String(job.tenant_id),kind:job.kind,source:job.source,payload:job.payload,attempt:Number(job.attempt),createdAt:new Date(job.created_at).toISOString()};
  let decision:AgentDecision,output:AgentOutput|null=null;
  try{({decision,output}=await evaluateAgentTask(task));}
  catch(error){
   const delay=agentRetryDelay(error,task.attempt,Number(job.max_attempts));
   if(delay!==null){
    const retried=await retryAgentJob((text,parameters)=>sql.query(text,parameters),{id:task.id,tenantId:task.tenantId,attempt:task.attempt,lease:String(job.lease)},delay);
    results.push({id:job.id,status:retried?'retry-scheduled':'claim-lost'});continue;
   }
   decision={taskId:task.id,status:'blocked',reason:'Execution failed or retry limit reached; review task before retrying'};
  }
  const status=decision.status==='ready'?'completed':decision.status==='needs-approval'?'needs-approval':'blocked';
  const next=nextAgentStage(task,decision,output);
  const settled=await settleAgentJob((text,parameters)=>sql.query(text,parameters),{id:task.id,tenantId:task.tenantId,attempt:task.attempt,lease:String(job.lease)},{status,result:output,reason:decision.reason,next});
  results.push({id:job.id,status:settled?status:'claim-lost'});
 }
 return NextResponse.json({processed:results.length,results},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Worker unavailable'},{status:503})}
}
