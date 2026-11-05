import {NextRequest,NextResponse} from 'next/server';
import {sessionCookie} from '../../../../lib/server/auth';
import {sameOrigin} from '../../../../lib/server/request-security';
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});const r=NextResponse.json({ok:true});r.cookies.set(sessionCookie,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return r}
