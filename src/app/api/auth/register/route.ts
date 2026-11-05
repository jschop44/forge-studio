import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {database} from '../../../../lib/server/db';
import {hashPassword,createSession,sessionCookie} from '../../../../lib/server/auth';
import {sameOrigin} from '../../../../lib/server/request-security';
export const runtime='nodejs';
const Credentials=z.object({email:z.string().email().max(254),password:z.string().min(12).max(256)});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 if(process.env.ENABLE_REGISTRATION!=='true')return NextResponse.json({error:'Registration is disabled'},{status:503});
 try{const raw=await req.text();if(raw.length>1000)return NextResponse.json({error:'Request too large'},{status:413});const input=Credentials.safeParse(JSON.parse(raw));if(!input.success)return NextResponse.json({error:'Valid email and password of at least 12 characters required'},{status:400});
 const id=crypto.randomUUID(),email=input.data.email.toLowerCase().trim(),hash=hashPassword(input.data.password),sql=database();
 const created=await sql`INSERT INTO forge_users(id,email,password_hash) VALUES(${id}::uuid,${email},${hash}) ON CONFLICT(email) DO NOTHING RETURNING id`;
 if(!created.length)return NextResponse.json({error:'Account already exists'},{status:409});
 const response=NextResponse.json({ok:true},{status:201});response.cookies.set(sessionCookie,await createSession(id),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:604800});return response;
 }catch{return NextResponse.json({error:'Registration unavailable'},{status:503})}
}
