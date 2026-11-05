import {NextRequest,NextResponse} from 'next/server';
import {database} from '../../../../lib/server/db';
import {currentUserId} from '../../../../lib/server/auth';
export const runtime='nodejs';
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))return new NextResponse('Not found',{status:404});
 const user=await currentUserId();if(!user)return new NextResponse('Unauthorized',{status:401});
 try{const sql=database();const rows=await sql`SELECT mime_type,bytes FROM forge_assets WHERE id=${id}::uuid AND owner_id=${user}::uuid LIMIT 1`;
 if(!rows.length)return new NextResponse('Not found',{status:404});
 const asset=rows[0];const bytes=asset.bytes instanceof Uint8Array?asset.bytes:Buffer.from(String(asset.bytes).replace(/^\\x/,''),'hex');
 return new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':String(asset.mime_type),'Cache-Control':'private,max-age=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch{return new NextResponse('Asset unavailable',{status:503})}
}
