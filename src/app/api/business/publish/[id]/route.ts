import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin} from '../../../../../lib/server/request-security';
import {currentUserId} from '../../../../../lib/server/auth';
import {database} from '../../../../../lib/server/db';
export const runtime='nodejs';

/** Unpublish all pages for one publication, scoped to the authenticated owner. */
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 if(process.env.ENABLE_BUSINESS_PUBLISHING!=='true')return NextResponse.json({error:'Business publishing is not configured'},{status:503});
 const owner=await currentUserId();
 if(!owner)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:'Invalid publication id'},{status:400});
 try{
  const sql=database();
  // Remove retained snapshots with the publication; no orphaned history remains.
  const removed=await sql`WITH gone AS (
    DELETE FROM forge_business_publications WHERE id=${id}::uuid AND owner_id=${owner}::uuid RETURNING id,slug
   ), discarded AS (
    DELETE FROM forge_business_publication_snapshots
    WHERE publication_id=${id}::uuid AND owner_id=${owner}::uuid
    AND EXISTS(SELECT 1 FROM gone) RETURNING version
   ) SELECT slug FROM gone`;
  if(!removed.length)return NextResponse.json({error:'Publication not found'},{status:404});
  return NextResponse.json({unpublished:true,removedPages:removed.length});
 }catch{return NextResponse.json({error:'Unable to unpublish'},{status:503})}
}
