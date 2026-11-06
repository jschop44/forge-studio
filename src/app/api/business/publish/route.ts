import {randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin} from '../../../../lib/server/request-security';
import {currentUserId} from '../../../../lib/server/auth';
import {database} from '../../../../lib/server/db';
import {validateBusinessPublicationRequest} from '../../../../lib/business-publication-request';
export const runtime='nodejs';

/** Opt-in publication; no write occurs without session, same-origin and explicit approval. */
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 if(process.env.ENABLE_BUSINESS_PUBLISHING!=='true')return NextResponse.json({error:'Business publishing is not configured'},{status:503});
 const owner=await currentUserId();
 if(!owner)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const body=await req.json();
  const checked=validateBusinessPublicationRequest(body);
  if(!checked.valid||!checked.pages)return NextResponse.json({error:'Publication validation failed',details:checked.errors.slice(0,10)},{status:422});
  const id=randomUUID(),sql=database();
  // A single INSERT statement prevents partially published multi-page sites.
  const pageRows=JSON.stringify(checked.pages.map(({slug,html})=>({slug,html})));
  await sql`INSERT INTO forge_business_publications(id,owner_id,slug,html)
    SELECT ${id}::uuid,${owner}::uuid,p.slug,p.html
    FROM jsonb_to_recordset(${pageRows}::jsonb) AS p(slug text,html text)`;
  return NextResponse.json({id,urls:checked.pages.map(page=>'/business-sites/'+id+'/'+page.slug),published:true},{status:201});
 }catch{
  return NextResponse.json({error:'Business publication unavailable; check database migrations'},{status:503});
 }
}

/** Owner-only listing; never expose HTML bodies or other owners' publications. */
export async function GET(){
 if(process.env.ENABLE_BUSINESS_PUBLISHING!=='true')return NextResponse.json({error:'Business publishing is not configured'},{status:503});
 const owner=await currentUserId();
 if(!owner)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const sql=database();
  const rows=await sql`SELECT id,COUNT(*)::int AS page_count,MIN(created_at) AS created_at
   FROM forge_business_publications WHERE owner_id=${owner}::uuid
   GROUP BY id ORDER BY MIN(created_at) DESC LIMIT 100`;
  return NextResponse.json({publications:rows.map(row=>({id:row.id,pageCount:row.page_count,createdAt:row.created_at,url:'/business-sites/'+row.id+'/index'}))});
 }catch{return NextResponse.json({error:'Unable to list publications'},{status:503})}
}
