import {NextRequest,NextResponse} from 'next/server';
import {database} from '../../../../lib/server/db';
import {createSession,sessionCookie,verifyPassword} from '../../../../lib/server/auth';
export const runtime='nodejs';
export async function POST(req:NextRequest){try{
 const {email,password}=await req.json();if(typeof email!=='string'||typeof password!=='string'||email.length>320||password.length>256)return NextResponse.json({error:'Invalid credentials'},{status:400});
 const sql=database();const users=await sql`SELECT id,password_hash FROM forge_users WHERE email=${email.toLowerCase().trim()} LIMIT 1`;const user=users[0];
 if(!user||!verifyPassword(password,String(user.password_hash)))return NextResponse.json({error:'Invalid credentials'},{status:401});
 const response=NextResponse.json({ok:true});response.cookies.set(sessionCookie,await createSession(String(user.id)),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:604800});return response;
 }catch{return NextResponse.json({error:'Login unavailable'},{status:503})}}
