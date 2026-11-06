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
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['version','expectedVersion'].includes(key)))return NextResponse.json({error:'Unexpected rollback fields'},{status:400});
  if(!Number.isSafeInteger(version)||version<1)return NextResponse.json({error:'Invalid snapshot version'},{status:400});
  const sql=database();
  // Restore content only when the current page set exactly matches the snapshot.
  // This avoids unsafe delete-and-reinsert operations on the same table in a CTE.
  const rows=await sql`WITH snapshot AS (
    SELECT slug,html FROM forge_business_publication_snapshots
    WHERE publication_id=${id}::uuid AND owner_id=${owner}::uuid AND version=${version}
   ), current_pages AS (
    SELECT slug FROM forge_business_publications WHERE id=${id}::uuid AND owner_id=${owner}::uuid
   ), compatible AS (
    SELECT EXISTS(SELECT 1 FROM snapshot)
     AND NOT EXISTS(SELECT slug FROM snapshot EXCEPT SELECT slug FROM current_pages)
     AND NOT EXISTS(SELECT slug FROM current_pages EXCEPT SELECT slug FROM snapshot) AS matches
   ), next_version AS (
    SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
    WHERE publication_id=${id}::uuid AND owner_id=${owner}::uuid
   ), recorded AS (
    INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
    SELECT ${id}::uuid,${owner}::uuid,n.version,s.slug,s.html
    FROM snapshot s CROSS JOIN next_version n CROSS JOIN compatible c
    WHERE c.matches AND n.version=${expectedVersion}+1
    RETURNING slug,version
   ), updated AS (
    UPDATE forge_business_publications p SET html=s.html
    FROM snapshot s WHERE p.id=${id}::uuid AND p.owner_id=${owner}::uuid AND p.slug=s.slug
      AND EXISTS(SELECT 1 FROM recorded)
    RETURNING p.slug
   ) SELECT COUNT(*)::int AS page_count,(SELECT MAX(version) FROM recorded) AS new_version FROM updated`;
  if(!rows.length||Number(rows[0].page_count)===0)return NextResponse.json({error:'Publication, snapshot, or current version mismatch. Refresh before restoring.'},{status:409});
  return NextResponse.json({restored:true,version,versionCreated:Number(rows[0].new_version),pageCount:Number(rows[0].page_count)});
 }catch(error){
  if(error&&typeof error==='object'&&'code' in error&&error.code==='23505')return NextResponse.json({error:'Rollback conflict. Reload saved versions and retry.'},{status:409});
  return NextResponse.json({error:'Rollback unavailable'},{status:503});
 }
}
