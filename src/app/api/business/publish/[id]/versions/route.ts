import {runtimeValue} from '../../../../../../lib/server/runtime-env';
import {NextResponse} from 'next/server';
import {currentUserId} from '../../../../../../lib/server/auth';
import {database} from '../../../../../../lib/server/db';
export const runtime='nodejs';

/** Owner-only snapshot metadata, without exposing stored HTML. */
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 if(runtimeValue('ENABLE_BUSINESS_PUBLISHING')!=='true')return NextResponse.json({error:'Business publishing is not configured'},{status:503});
 const owner=await currentUserId();
 if(!owner)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:'Invalid publication id'},{status:400});
 try{
  const sql=database();
  const versions=await sql`SELECT s.version,COUNT(*)::int AS page_count,MIN(s.created_at) AS created_at
   FROM forge_business_publication_snapshots s
   WHERE s.publication_id=${id}::uuid AND s.owner_id=${owner}::uuid
   AND EXISTS(SELECT 1 FROM forge_business_publications p WHERE p.id=s.publication_id AND p.owner_id=s.owner_id)
   GROUP BY s.version ORDER BY s.version DESC LIMIT 100`;
  return NextResponse.json({versions:versions.map(v=>({version:v.version,pageCount:v.page_count,createdAt:v.created_at}))});
 }catch{return NextResponse.json({error:'Unable to list versions'},{status:503})}
}
