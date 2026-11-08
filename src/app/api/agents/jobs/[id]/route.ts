import {NextRequest,NextResponse} from 'next/server';
import {database} from '../../../../../lib/server/db';
import {currentUserId} from '../../../../../lib/server/auth';
import {sameOrigin} from '../../../../../lib/server/request-security';
import {planNextTask} from '../../../../../lib/agents/orchestrator';
import {executeAgent} from '../../../../../lib/agents/execution';
import {nextAgentStage} from '../../../../../lib/agents/handoff';
import {settleAgentJob} from '../../../../../lib/server/agent-job-settlement';
import type {AgentTask} from '../../../../../lib/agents/types';
export const runtime='nodejs';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:'Invalid ID'},{status:400});
 try{const sql=database();const rows=await sql`SELECT * FROM forge_jobs WHERE id=${id}::uuid AND tenant_id=${user}::uuid AND status='pending' LIMIT 1`;
 if(!rows.length)return NextResponse.json({error:'Pending job not found'},{status:404});
 const job=rows[0];const claimed=await sql`UPDATE forge_jobs SET status='evaluating',updated_at=now() WHERE id=${id}::uuid AND tenant_id=${user}::uuid AND status='pending' RETURNING id,updated_at::text AS lease`;if(!claimed.length)return NextResponse.json({error:'Job already claimed'},{status:409});const decision=planNextTask({id:String(job.id),tenantId:String(job.tenant_id),kind:job.kind,source:job.source,payload:job.payload,attempt:Number(job.attempt),createdAt:new Date(job.created_at).toISOString()});
 const status=decision.status==='ready'?'completed':decision.status==='needs-approval'?'needs-approval':'blocked';
 const output=status==='completed'?await executeAgent({id:String(job.id),tenantId:String(job.tenant_id),kind:job.kind,source:job.source,payload:job.payload,attempt:Number(job.attempt),createdAt:new Date(job.created_at).toISOString()}):null;
 const task:AgentTask={id:String(job.id),tenantId:String(job.tenant_id),kind:job.kind,source:job.source,payload:job.payload,attempt:Number(job.attempt),createdAt:new Date(job.created_at).toISOString()};
 const settled=await settleAgentJob((text,parameters)=>sql.query(text,parameters),{id:task.id,tenantId:user,attempt:task.attempt,lease:String(claimed[0].lease)},{status,result:output,reason:decision.reason,next:nextAgentStage(task,decision,output)});
 if(!settled)return NextResponse.json({error:'Job claim expired; refresh its status'},{status:409});
 return NextResponse.json({decision,status});
 }catch{return NextResponse.json({error:'Job evaluation failed'},{status:503})}
}
