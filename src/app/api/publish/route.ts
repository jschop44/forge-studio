import {NextRequest,NextResponse} from 'next/server';
import {database} from '../../../lib/server/db';
import {currentUserId} from '../../../lib/server/auth';
import {SiteSchema} from '../../../lib/schema';
import {renderStaticHtml} from '../../../lib/export';
import {slugify} from '../../../lib/validators';
export const runtime='nodejs';
export async function POST(req:NextRequest){if(process.env.ENABLE_PUBLISHING!=='true')return NextResponse.json({error:'Publishing is not configured'},{status:503});const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});try{
 const {projectId}=await req.json();if(typeof projectId!=='string'||!/^[0-9a-f-]{36}$/i.test(projectId))return NextResponse.json({error:'Invalid project'},{status:400});
 const sql=database();const rows=await sql`SELECT site FROM forge_projects WHERE id=${projectId}::uuid AND owner_id=${user}::uuid LIMIT 1`;if(!rows.length)return NextResponse.json({error:'Not found'},{status:404});
 const site=SiteSchema.parse(rows[0].site);const slug=slugify(site.name)+'-'+projectId.slice(0,8);const html=renderStaticHtml(site);
 await sql`INSERT INTO forge_publications(slug,project_id,owner_id,html) VALUES(${slug},${projectId}::uuid,${user}::uuid,${html}) ON CONFLICT(slug) DO UPDATE SET html=EXCLUDED.html,version=forge_publications.version+1,published_at=now() WHERE forge_publications.owner_id=${user}::uuid`;
 return NextResponse.json({url:'/sites/'+slug,slug});
 }catch{return NextResponse.json({error:'Publishing failed'},{status:503})}}
