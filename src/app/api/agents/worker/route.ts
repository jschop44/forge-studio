import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {database} from '../../../../lib/server/db';
import {planNextTask} from '../../../../lib/agents/orchestrator';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(process.env.ENABLE_AGENT_QUEUE!=='true')return NextResponse.json({error:'Worker disabled'},{status:503});
 const secret=process.env.FORGE_WORKER_SECRET||'',provided=req.headers.get('x-forge-worker-key')||'';
 if(secret.length<32||provided.length!==secret.length||!timingSafeEqual(Buffer.from(secret),Buffer.from(provided)))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const sql=database();const claimed=await sql`UPDATE forge_jobs SET status='evaluating',updated_at=now() WHERE id IN (SELECT id FROM forge_jobs WHERE status='pending' AND available_at<=now() ORDER BY created_at ASC LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING id,tenant_id,kind,source,payload,attempt,created_at`;
 const results=[];for(const job of claimed){try{const decision=planNextTask({id:String(job.id),tenantId:String(job.tenant_id),kind:job.kind,source:job.source,payload:job.payload,attempt:Number(job.attempt),createdAt:new Date(job.created_at).toISOString()});const status=decision.status==='ready'?'planned':decision.status==='needs-approval'?'needs-approval':'blocked';await sql`UPDATE forge_jobs SET status=${status},last_error=${decision.reason},updated_at=now() WHERE id=${job.id}::uuid AND status='evaluating'`;results.push({id:job.id,status})}catch(error){await sql`UPDATE forge_jobs SET status='blocked',last_error='Policy evaluation failed',updated_at=now() WHERE id=${job.id}::uuid`;results.push({id:job.id,status:'blocked'})}}
 return NextResponse.json({processed:results.length,results},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Worker unavailable'},{status:503})}
}
