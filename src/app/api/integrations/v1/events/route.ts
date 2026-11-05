import {NextRequest,NextResponse} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {database} from '../../../../../lib/server/db';
const Input=z.object({eventId:z.string().uuid(),tenantId:z.string().uuid(),source:z.enum(['leadflow','growth-lens']),businessName:z.string().min(2).max(120),website:z.string().url().max(2048).optional(),summary:z.string().max(3000).optional(),consent:z.literal(true)});
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(process.env.ENABLE_ECOSYSTEM_INTEGRATION!=='true')return NextResponse.json({error:'Integration disabled'},{status:503});
 const secret=process.env.FORGE_INTEGRATION_SECRET;if(!secret||secret.length<32)return NextResponse.json({error:'Integration not configured'},{status:503});
 try{const timestamp=req.headers.get('x-forge-timestamp')||'',signature=req.headers.get('x-forge-signature')||'';
 if(!/^\d{10,13}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>300000)return NextResponse.json({error:'Expired request'},{status:401});
 const raw=await req.text();if(raw.length>16000)return NextResponse.json({error:'Payload too large'},{status:413});
 const expected=createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');
 if(!/^[a-f0-9]{64}$/i.test(signature)||!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex')))return NextResponse.json({error:'Signature rejected'},{status:401});
 const parsed=Input.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Invalid event or missing consent'},{status:400});
 const e=parsed.data,sql=database();const payload=JSON.stringify({businessName:e.businessName,website:e.website,summary:e.summary,eventId:e.eventId,consent:e.consent});
 const rows=await sql`INSERT INTO forge_jobs(id,tenant_id,kind,source,payload) SELECT ${e.eventId}::uuid,id,'lead-enrichment',${e.source},${payload}::jsonb FROM forge_users WHERE id=${e.tenantId}::uuid ON CONFLICT(id) DO NOTHING RETURNING id`;
 return NextResponse.json({accepted:true,duplicate:rows.length===0},{status:202});
 }catch{return NextResponse.json({error:'Integration unavailable'},{status:503})}
}
