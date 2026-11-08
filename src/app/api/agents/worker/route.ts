import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {database} from '../../../../lib/server/db';
import {planNextTask} from '../../../../lib/agents/orchestrator';
import {executeSafeAgent,type AgentOutput} from '../../../../lib/agents/execution';
import {settleAgentJob} from '../../../../lib/server/agent-job-settlement';
import type {AgentDecision,AgentTask} from '../../../../lib/agents/types';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(process.env.ENABLE_AGENT_QUEUE!=='true')return NextResponse.json({error:'Worker disabled'},{status:503});
 const secret=process.env.FORGE_WORKER_SECRET||'',provided=req.headers.get('x-forge-worker-key')||'';
 if(secret.length<32||provided.length!==secret.length||!timingSafeEqual(Buffer.from(secret),Buffer.from(provided)))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const sql=database();await sql`UPDATE forge_jobs SET status='pending',attempt=attempt+1,updated_at=now() WHERE status='evaluating' AND updated_at<now()-interval '15 minutes' AND attempt<max_attempts`;await sql`UPDATE forge_jobs SET status='blocked',last_error='Maximum retry attempts exceeded',updated_at=now() WHERE status='evaluating' AND updated_at<now()-interval '15 minutes' AND attempt>=max_attempts`;const claimed=await sql`UPDATE forge_jobs SET status='evaluating',updated_at=now() WHERE id IN (SELECT id FROM forge_jobs WHERE status='pending' AND available_at<=now() ORDER BY created_at ASC LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING id,tenant_id,kind,source,payload,attempt,created_at,updated_at::text AS lease`;
 const results=[];
 for(const job of claimed){
  const task:AgentTask={id:String(job.id),tenantId:String(job.tenant_id),kind:job.kind,source:job.source,payload:job.payload,attempt:Number(job.attempt),createdAt:new Date(job.created_at).toISOString()};
  let decision:AgentDecision,output:AgentOutput|null=null;
  try{decision=planNextTask(task);if(decision.status==='ready')output=executeSafeAgent(task);}
  catch{decision={taskId:task.id,status:'blocked',reason:'Policy evaluation failed'};}
  const status=decision.status==='ready'?'completed':decision.status==='needs-approval'?'needs-approval':'blocked';
  const next=status==='completed'&&decision.next?{
   id:crypto.randomUUID(),kind:decision.next,payload:{
    ...task.payload,previousResult:output?.data,
    ...(decision.next==='site-generation'?{approvedPlan:false}:{}),
    ...(decision.next==='quality-review'?{pages:output?.data.pages,html:((output?.data.pages as {html:string}[]|undefined)?.[0]?.html)||''}:{})
   }
  }:undefined;
  const settled=await settleAgentJob((text,parameters)=>sql.query(text,parameters),{id:task.id,tenantId:task.tenantId,attempt:task.attempt,lease:String(job.lease)},{status,result:output,reason:decision.reason,next});
  results.push({id:job.id,status:settled?status:'claim-lost'});
 }
 return NextResponse.json({processed:results.length,results},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Worker unavailable'},{status:503})}
}
