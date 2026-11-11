import {limitedRequestBody,RequestBodyTooLarge} from '../../../../../lib/server/limited-request-body';
import {runtimeValue} from '../../../../../lib/server/runtime-env';
import {NextRequest,NextResponse} from 'next/server';
import {verifySignedEvent} from '../../../../../lib/integrations/signature';
import {matchesAcceptedBusinessEvent} from '../../../../../lib/integrations/event-idempotency';
import {z} from 'zod';
import {database} from '../../../../../lib/server/db';
const Input=z.object({eventId:z.string().uuid(),tenantId:z.string().uuid(),source:z.enum(['leadflow','growth-lens']),businessName:z.string().min(2).max(120),website:z.string().url().max(2048).optional(),summary:z.string().max(3000).optional(),consent:z.literal(true)});
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(runtimeValue('ENABLE_ECOSYSTEM_INTEGRATION')!=='true')return NextResponse.json({error:'Integration disabled'},{status:503});
 const secret=runtimeValue('FORGE_INTEGRATION_SECRET');if(!secret||secret.length<32)return NextResponse.json({error:'Integration not configured'},{status:503});
 try{const timestamp=req.headers.get('x-forge-timestamp')||'',signature=req.headers.get('x-forge-signature')||'';
 if(!/^[0-9]{13}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>300000||!/^[a-f0-9]{64}$/i.test(signature))return NextResponse.json({error:'Invalid signature or expired event'},{status:401});
 const raw=await limitedRequestBody(req,16000);if(!verifySignedEvent(secret,timestamp,signature,raw))return NextResponse.json({error:'Invalid signature or expired event'},{status:401});
 const parsed=Input.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Invalid event or missing consent'},{status:400});
 const e=parsed.data,sql=database();const payload=JSON.stringify({businessName:e.businessName,website:e.website,summary:e.summary,eventId:e.eventId,consent:e.consent});
 const rows=await sql`INSERT INTO forge_jobs(id,tenant_id,kind,source,payload) SELECT ${e.eventId}::uuid,id,'lead-enrichment',${e.source},${payload}::jsonb FROM forge_users WHERE id=${e.tenantId}::uuid ON CONFLICT(id) DO NOTHING RETURNING id`;
 let duplicate=false;
 if(rows.length===0){
  // ON CONFLICT(id) might be another tenant's event or a changed replay.
  // Never acknowledge a conflict without checking ownership and original facts.
  const previous=await sql`SELECT tenant_id::text AS tenant_id,source,payload FROM forge_jobs WHERE id=${e.eventId}::uuid LIMIT 1`;
  if(previous.length){
   if(!matchesAcceptedBusinessEvent({tenantId:previous[0].tenant_id,source:previous[0].source,payload:previous[0].payload},e))return NextResponse.json({error:'Event ID conflicts with a different request'},{status:409});
   duplicate=true;
  }else{
   const owner=await sql`SELECT id FROM forge_users WHERE id=${e.tenantId}::uuid LIMIT 1`;
   if(!owner.length)return NextResponse.json({error:'Tenant not found'},{status:404});
   return NextResponse.json({error:'Event was not stored; retry with the same event ID'},{status:503});
  }
 }
 return NextResponse.json({accepted:true,duplicate},{status:202});
 }catch(error){if(error instanceof RequestBodyTooLarge)return NextResponse.json({error:'Event too large'},{status:413});return NextResponse.json({error:'Integration unavailable'},{status:503})}
}
