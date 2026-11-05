import {NextRequest,NextResponse} from 'next/server';
import {currentUserId} from '../../../../lib/server/auth';
import {sameOrigin} from '../../../../lib/server/request-security';
import {auditGeneratedSite} from '../../../../lib/site-audit';
export const runtime='nodejs';
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});try{const raw=await req.text();if(raw.length>260000)return NextResponse.json({error:'Document too large'},{status:413});return NextResponse.json(auditGeneratedSite(JSON.parse(raw)),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Invalid site document'},{status:400})}}
