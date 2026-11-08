import {runtimeValue} from '../../../../lib/server/runtime-env';
import {NextResponse} from 'next/server';
import {database} from '../../../../lib/server/db';
import {readinessConfig} from '../../../../lib/server/readiness-config';
export const runtime='nodejs';
export async function GET(){
 const config=readinessConfig({DATABASE_URL:runtimeValue('DATABASE_URL'),AUTH_SECRET:runtimeValue('AUTH_SECRET')});
 if(!config.configured)return NextResponse.json({ready:false,reason:'Server not configured',missing:config.missing},{status:503,headers:{'Cache-Control':'no-store'}});
 try{const sql=database();await sql`SELECT 1 AS ready`;return NextResponse.json({ready:true,service:'forge-studio',database:'reachable'},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({ready:false,reason:'Database unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
