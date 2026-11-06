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
  const expectedVersion=body?.expectedVersion;
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)return NextResponse.json({error:'Expected current version required'},{status:400});
  if(!Number.isSafeInteger(version)||version<1)return NextResponse.json({error:'Invalid snapshot version'},{status:400});
  const sql=database();
  // Restore content only when the current page set exactly matches the snapshot.
  // This avoids unsafe delete-and-reinsert operations on the same table in a CTE.
  const rows=await sql`WITH snapshot AS (
    SELECT slug,html FROM forge_business_publication_snapshots
    WHERE publication_id=${id}::uuid AND owner_id=${owner}::uuid AND version=${version}
   ), current_version AS (
    SELECT MAX(version) AS version FROM forge_business_publication_snapshots
    WHERE publication_id=${id}::uuid AND owner_id=${owner}::uuid
   ), current_pages AS (
    SELECT slug FROM forge_business_publications WHERE id=${id}::uuid AND owner_id=${owner}::uuid
   ), compatible AS (
    SELECT EXISTS(SELECT 1 FROM snapshot) AND
     NOT EXISTS((SELECT slug FROM snapshot EXCEPT SELECT slug FROM current_pages)) AND
     NOT EXISTS((SELECT slug FROM current_pages EXCEPT SELECT slug FROM snapshot)) AS matches
   )
   UPDATE forge_business_publications p SET html=s.html
   FROM snapshot s,compatible c
   WHERE c.matches AND (SELECT version FROM current_version)=${expectedVersion} AND p.id=${id}::uuid AND p.owner_id=${owner}::uuid AND p.slug=s.slug
   RETURNING p.slug`;
  if(!rows.length)return NextResponse.json({error:'Publication, snapshot, or current version mismatch. Refresh before restoring.'},{status:409});
  return NextResponse.json({restored:true,version,pageCount:rows.length});
 }catch{return NextResponse.json({error:'Rollback unavailable'},{status:503})}
}
