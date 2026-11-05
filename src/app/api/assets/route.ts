import {NextRequest,NextResponse} from 'next/server';
import {currentUserId} from '../../../lib/server/auth';
import {database} from '../../../lib/server/db';
import {sameOrigin} from '../../../lib/server/request-security';
import {validateAsset} from '../../../lib/asset-policy';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 if(process.env.ENABLE_ASSET_STORAGE!=='true')return NextResponse.json({error:'Asset storage disabled'},{status:503});
 const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
 const length=Number(req.headers.get('content-length')||0);if(length>13*1024*1024)return NextResponse.json({error:'Upload too large'},{status:413});
 const data=await req.formData();const file=data.get('file');
 if(!(file instanceof File))return NextResponse.json({error:'File required'},{status:400});
 const validation=validateAsset(file);if(!validation.ok)return NextResponse.json({error:validation.reason},{status:400});
 const projectId=data.get('projectId');if(projectId!==null&&(typeof projectId!=='string'||!/^[-a-f0-9]{36}$/i.test(projectId)))return NextResponse.json({error:'Invalid project ID'},{status:400});
 const sql=database();if(projectId){const found=await sql`SELECT id FROM forge_projects WHERE id=${projectId}::uuid AND owner_id=${user}::uuid`;if(!found.length)return NextResponse.json({error:'Project not found'},{status:404})}
 const quota=await sql`SELECT count(*)::int AS files,coalesce(sum(octet_length(bytes)),0)::bigint AS used FROM forge_assets WHERE owner_id=${user}::uuid`;if(Number(quota[0]?.files||0)>=20||Number(quota[0]?.used||0)+file.size>48*1024*1024)return NextResponse.json({error:'Private asset quota exceeded (20 files / 48 MB)'},{status:413});
 const id=crypto.randomUUID(),bytes=Buffer.from(await file.arrayBuffer());const hex=bytes.toString('hex');
 if(file.name.toLowerCase().endsWith('.glb')&&bytes.toString('ascii',0,4)!=='glTF')return NextResponse.json({error:'Invalid GLB signature'},{status:400});
 await sql`INSERT INTO forge_assets(id,owner_id,project_id,name,mime_type,bytes) VALUES(${id}::uuid,${user}::uuid,${projectId||null}::uuid,${file.name},${file.type},decode(${hex},'hex'))`;
 return NextResponse.json({id,url:'/api/assets/'+id,name:file.name,type:file.type},{status:201});
 }catch{return NextResponse.json({error:'Asset upload failed'},{status:503})}
}
export async function GET(){const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});try{const sql=database();const rows=await sql`SELECT id,name,mime_type,project_id,created_at FROM forge_assets WHERE owner_id=${user}::uuid ORDER BY created_at DESC LIMIT 100`;return NextResponse.json({assets:rows},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Asset list unavailable'},{status:503})}}
