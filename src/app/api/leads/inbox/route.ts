import {NextResponse} from 'next/server';
import {currentUserId} from '../../../../lib/server/auth';
import {database} from '../../../../lib/server/db';
export const runtime='nodejs';
export async function GET(){
 const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const sql=database();const leads=await sql`SELECT id,project_id,name,email,message,created_at FROM forge_leads WHERE owner_id=${user}::uuid ORDER BY created_at DESC LIMIT 100`;return NextResponse.json({leads},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Lead inbox unavailable'},{status:503})}
}
