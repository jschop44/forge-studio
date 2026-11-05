import {NextResponse} from 'next/server';import {sessionCookie} from '../../../../lib/server/auth';
export async function POST(){const r=NextResponse.json({ok:true});r.cookies.set(sessionCookie,'',{httpOnly:true,sameSite:'lax',path:'/',maxAge:0});return r}
