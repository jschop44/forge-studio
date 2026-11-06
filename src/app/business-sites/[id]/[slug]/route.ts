import {NextRequest,NextResponse} from 'next/server';
import {database} from '../../../../lib/server/db';
export const runtime='nodejs';

/** Serve only stored publication pages. Scripts and active embedded content are disabled. */
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string;slug:string}>}){
 if(process.env.ENABLE_BUSINESS_PUBLISHING!=='true')return new NextResponse('Publication unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
 const {id,slug:rawSlug}=await params;
 const slug=rawSlug.endsWith('.html')?rawSlug.slice(0,-5):rawSlug;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^[a-z0-9-]{1,64}$/.test(slug))
  return new NextResponse('Not found',{status:404});
 try{
  const sql=database();
  const rows=await sql`SELECT html FROM forge_business_publications WHERE id=${id}::uuid AND slug=${slug} LIMIT 1`;
  if(!rows.length)return new NextResponse('Not found',{status:404});
  return new NextResponse(String(rows[0].html),{headers:{
   'Content-Type':'text/html; charset=utf-8',
   'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
   'X-Content-Type-Options':'nosniff',
   'Referrer-Policy':'no-referrer',
   'Cache-Control':'no-store'
  }});
 }catch{return new NextResponse('Publication unavailable',{status:503})}
}
