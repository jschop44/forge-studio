import {sameOrigin} from '../../../lib/server/request-security';
import {NextRequest,NextResponse} from 'next/server';
import {database} from '../../../lib/server/db';
import {currentUserId} from '../../../lib/server/auth';
import {SiteSchema} from '../../../lib/schema';
import {renderStaticHtml} from '../../../lib/export';
import {leadFormHtml} from '../../../lib/lead-forms';
import {slugify} from '../../../lib/validators';
export const runtime='nodejs';
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});if(process.env.ENABLE_PUBLISHING!=='true')return NextResponse.json({error:'Publishing is not configured'},{status:503});const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});try{
 const {projectId}=await req.json();if(typeof projectId!=='string'||!/^[0-9a-f-]{36}$/i.test(projectId))return NextResponse.json({error:'Invalid project'},{status:400});
 const sql=database();const rows=await sql`SELECT site FROM forge_projects WHERE id=${projectId}::uuid AND owner_id=${user}::uuid LIMIT 1`;if(!rows.length)return NextResponse.json({error:'Not found'},{status:404});
 const site=SiteSchema.parse(rows[0].site);const slug=slugify(site.name)+'-'+projectId.slice(0,8);const html=renderStaticHtml(site).replace('</footer>',leadFormHtml(projectId)+'</footer>').replace('</style>','.forge-contact-form{max-width:540px;margin:35px auto;text-align:left;display:grid;gap:12px}.forge-contact-form label{display:block;color:#ddd}.forge-contact-form input,.forge-contact-form textarea{display:block;width:100%;margin-top:6px;padding:12px;background:#202127;color:#fff;border:1px solid #666;border-radius:6px}.forge-contact-form button{background:'+site.accent+';color:#111}.forge-honeypot{position:absolute;left:-9999px;opacity:0}</style>');
 await sql`INSERT INTO forge_publications(slug,project_id,owner_id,html) VALUES(${slug},${projectId}::uuid,${user}::uuid,${html}) ON CONFLICT(slug) DO UPDATE SET html=EXCLUDED.html,version=forge_publications.version+1,published_at=now() WHERE forge_publications.owner_id=${user}::uuid`;
 return NextResponse.json({url:'/sites/'+slug,slug});
 }catch{return NextResponse.json({error:'Publishing failed'},{status:503})}}
