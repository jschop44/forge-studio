import {NextRequest,NextResponse} from 'next/server';
import {LeadFormSchema} from '../../../lib/lead-forms';
import {database} from '../../../lib/server/db';
export const runtime='nodejs';
const attempts=new Map<string,{count:number;until:number}>();
export async function POST(req:NextRequest){
 if(process.env.ENABLE_LEAD_CAPTURE!=='true')return NextResponse.json({error:'Lead capture is disabled'},{status:503});
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';const now=Date.now();const prev=attempts.get(ip);if(prev&&prev.until>now&&prev.count>=5)return NextResponse.json({error:'Too many submissions'},{status:429});attempts.set(ip,{count:prev&&prev.until>now?prev.count+1:1,until:prev&&prev.until>now?prev.until:now+3600000});
 const type=req.headers.get('content-type')||'';if(!type.includes('application/x-www-form-urlencoded'))return NextResponse.json({error:'Unsupported content type'},{status:415});
 try{const body=await req.text();if(body.length>10000)return NextResponse.json({error:'Too large'},{status:413});
 const data=Object.fromEntries(new URLSearchParams(body));const parsed=LeadFormSchema.safeParse(data);
 if(!parsed.success||!parsed.data.projectId)return NextResponse.json({error:'Invalid form'},{status:400});
 if(parsed.data.website)return NextResponse.json({ok:true});
 const sql=database();const {name,email,message,projectId}=parsed.data;
 const result=await sql`INSERT INTO forge_leads(id,owner_id,project_id,name,email,message) SELECT ${crypto.randomUUID()}::uuid,owner_id,id,${name},${email},${message} FROM forge_projects WHERE id=${projectId}::uuid AND EXISTS(SELECT 1 FROM forge_publications WHERE project_id=${projectId}::uuid) RETURNING id`;
 if(!result.length)return NextResponse.json({error:'Project not found'},{status:404});
 return new NextResponse('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Inquiry received</title></head><body><h1>Thank you</h1><p>Your inquiry has been received.</p></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Unable to submit inquiry'},{status:503})}
}
