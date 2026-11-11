import {NextResponse} from 'next/server';
import {database} from '../../../../lib/server/db';
import {currentUserId} from '../../../../lib/server/auth';
import {summarizeDurableStages} from '../../../../lib/agents/pipeline-observability';
export const runtime='nodejs';
export async function GET(){
 const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const sql=database();const rows=await sql`SELECT
 (SELECT count(*)::int FROM forge_projects WHERE owner_id=${user}::uuid) AS projects,
 (SELECT count(*)::int FROM forge_publications WHERE owner_id=${user}::uuid) AS published,
 (SELECT count(*)::int FROM forge_leads WHERE owner_id=${user}::uuid) AS leads,
 (SELECT count(*)::int FROM forge_assets WHERE owner_id=${user}::uuid) AS assets,
 (SELECT count(*)::int FROM forge_jobs WHERE tenant_id=${user}::uuid) AS jobs,
 (SELECT count(*)::int FROM forge_jobs WHERE tenant_id=${user}::uuid AND status='completed') AS completed,
 (SELECT count(*)::int FROM forge_jobs WHERE tenant_id=${user}::uuid AND status='needs-approval') AS approvals,
 (SELECT count(*)::int FROM forge_jobs WHERE tenant_id=${user}::uuid AND status='blocked') AS blocked,
 (SELECT count(*)::int FROM forge_feedback WHERE owner_id=${user}::uuid) AS feedback`;
 const stageRows=await sql`SELECT kind,status,count(*)::int AS total,max(updated_at) AS last_updated
 FROM forge_jobs WHERE tenant_id=${user}::uuid GROUP BY kind,status`;
 return NextResponse.json({metrics:rows[0],pipeline:summarizeDurableStages(stageRows)},{headers:{'Cache-Control':'private,no-store'}});
 }catch{return NextResponse.json({error:'Metrics unavailable'},{status:503})}
}
