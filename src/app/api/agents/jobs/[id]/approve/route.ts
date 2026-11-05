import {NextRequest,NextResponse} from 'next/server';
import {currentUserId} from '../../../../../../lib/server/auth';
import {sameOrigin} from '../../../../../../lib/server/request-security';
import {database} from '../../../../../../lib/server/db';
export const runtime='nodejs';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:'Invalid job ID'},{status:400});
 try{const sql=database();const rows=await sql`SELECT kind,status FROM forge_jobs WHERE id=${id}::uuid AND tenant_id=${user}::uuid LIMIT 1`;if(!rows.length)return NextResponse.json({error:'Job not found'},{status:404});
 if(rows[0].status!=='needs-approval')return NextResponse.json({error:'Job is not awaiting approval'},{status:409});
 if(rows[0].kind!=='site-generation')return NextResponse.json({error:'Publication approval must use the dedicated publish workflow'},{status:409});
 await sql`UPDATE forge_jobs SET payload=jsonb_set(payload,'{approvedPlan}','true'::jsonb),approved=TRUE,status='pending',updated_at=now() WHERE id=${id}::uuid AND tenant_id=${user}::uuid AND status='needs-approval'`;
 return NextResponse.json({ok:true,status:'pending'});
 }catch{return NextResponse.json({error:'Approval failed'},{status:503})}
}
