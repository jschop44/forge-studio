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
  for(const page of checked.pages){
   await sql`INSERT INTO forge_business_publications(id,owner_id,slug,html) VALUES(${id}::uuid,${owner}::uuid,${page.slug},${page.html})`;
  }
  return NextResponse.json({id,urls:checked.pages.map(page=>'/business-sites/'+id+'/'+page.slug),published:true},{status:201});
 }catch{
  return NextResponse.json({error:'Business publication unavailable; check database migrations'},{status:503});
 }
}
