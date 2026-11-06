import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin} from '../../../../../../lib/server/request-security';
import {currentUserId} from '../../../../../../lib/server/auth';
import {database} from '../../../../../../lib/server/db';
import {validateBusinessPublicationRequest} from '../../../../../../lib/business-publication-request';
export const runtime='nodejs';

/** Save a reviewed revision of an existing publication without losing prior versions. */
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 if(process.env.ENABLE_BUSINESS_PUBLISHING!=='true')return NextResponse.json({error:'Business publishing is not configured'},{status:503});
 const owner=await currentUserId();
 if(!owner)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:'Invalid publication id'},{status:400});
 try{
  const payload=await req.json();
  const expectedVersion=payload?.expectedVersion;
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)return NextResponse.json({error:'Expected publication version required'},{status:400});
  const checked=validateBusinessPublicationRequest({ownerApproved:payload?.ownerApproved,businessName:payload?.businessName,pages:payload?.pages});
  if(!checked.valid||!checked.pages)return NextResponse.json({error:'Invalid revision',details:checked.errors.slice(0,10)},{status:422});
  const pageRows=JSON.stringify(checked.pages.map(({slug,html})=>({slug,html})));
  const sql=database();
  // A single SQL statement makes version capture and live-page replacement atomic.
  // Page slugs must match exactly; a future migration will support page-set changes.
  const rows=await sql`WITH proposed AS (
     SELECT p.slug,p.html FROM jsonb_to_recordset(${pageRows}::jsonb) AS p(slug text,html text)
   ), existing AS (
     SELECT slug FROM forge_business_publications WHERE id=${id}::uuid AND owner_id=${owner}::uuid
   ), compatible AS (
     SELECT EXISTS(SELECT 1 FROM existing)
      AND NOT EXISTS(SELECT slug FROM proposed EXCEPT SELECT slug FROM existing)
      AND NOT EXISTS(SELECT slug FROM existing EXCEPT SELECT slug FROM proposed) AS matches
   ), next_version AS (
     SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
     WHERE publication_id=${id}::uuid AND owner_id=${owner}::uuid
   ), snapshot AS (
     INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
     SELECT ${id}::uuid,${owner}::uuid,v.version,p.slug,p.html
     FROM proposed p CROSS JOIN next_version v CROSS JOIN compatible c WHERE c.matches AND v.version=${expectedVersion}+1
     RETURNING slug,version
   ), updated AS (
     UPDATE forge_business_publications live SET html=p.html
     FROM proposed p WHERE live.id=${id}::uuid AND live.owner_id=${owner}::uuid
      AND live.slug=p.slug AND EXISTS(SELECT 1 FROM snapshot)
     RETURNING live.slug
   ) SELECT (SELECT MAX(version) FROM snapshot) AS version,COUNT(*)::int AS page_count FROM updated`;
  const result=rows[0];
  if(!result||Number(result.page_count)===0)return NextResponse.json({error:'Publication missing, revision conflict, or page structure changed. Refresh versions before retrying.'},{status:409});
  return NextResponse.json({saved:true,id,version:Number(result.version),pageCount:Number(result.page_count)});
 }catch(error){
  // A simultaneous request may win the immutable snapshot unique constraint.
  // Report a conflict rather than a transient infrastructure failure.
  if(error&&typeof error==='object'&&'code' in error&&error.code==='23505')
   return NextResponse.json({error:'Revision conflict. Reload the latest version and review again.'},{status:409});
  return NextResponse.json({error:'Revision unavailable; check migration or concurrent updates'},{status:503});
 }
}
