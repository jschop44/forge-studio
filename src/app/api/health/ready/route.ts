import {NextResponse} from 'next/server';
import {database} from '../../../../lib/server/db';
export const runtime='nodejs';
export async function GET(){
 if(!process.env.DATABASE_URL||!process.env.AUTH_SECRET)return NextResponse.json({ready:false,reason:'Server not configured'},{status:503});
 try{const sql=database();await sql`SELECT 1 AS ready`;return NextResponse.json({ready:true,service:'forge-studio',database:'reachable'},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({ready:false,reason:'Database unavailable'},{status:503})}
}
