import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin} from '../../../../../../lib/server/request-security';
import {currentUserId} from '../../../../../../lib/server/auth';
import {database} from '../../../../../../lib/server/db';
export const runtime='nodejs';

/** Restore a previous stored snapshot; only the publication owner can mutate it. */
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 if(process.env.ENABLE_BUSINESS_PUBLISHING!=='true')return NextResponse.json({error:'Business publishing is not configured'},{status:503});
 const owner=await currentUserId();
 if(!owner)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:'Invalid publication id'},{status:400});
 try{
  const body=await req.json();
  const version=body?.version;
  if(!Number.isSafeInteger(version)||version<1)return NextResponse.json({error:'Invalid snapshot version'},{status:400});
  const sql=database();
  // A single statement makes restoration atomic, including deletion of newer pages.
  const rows=await sql`WITH owned AS (
    SELECT DISTINCT id FROM forge_business_publications WHERE id=${id}::uuid AND owner_id=${owner}::uuid
   ), snapshot AS (
    SELECT s.slug,s.html FROM forge_business_publication_snapshots s
    JOIN owned ON owned.id=s.publication_id
    WHERE s.owner_id=${owner}::uuid AND s.version=${version}
   ), removed AS (
    DELETE FROM forge_business_publications
    WHERE id=${id}::uuid AND owner_id=${owner}::uuid
    AND EXISTS (SELECT 1 FROM snapshot)
    RETURNING id
   ), restored AS (
    INSERT INTO forge_business_publications(id,owner_id,slug,html)
    SELECT ${id}::uuid,${owner}::uuid,s.slug,s.html FROM snapshot s
    WHERE EXISTS (SELECT 1 FROM removed)
    RETURNING slug
   ) SELECT slug FROM restored`;
  if(!rows.length)return NextResponse.json({error:'Publication or snapshot not found'},{status:404});
  return NextResponse.json({restored:true,version,pageCount:rows.length});
 }catch{return NextResponse.json({error:'Rollback unavailable'},{status:503})}
}
