import {sameOrigin} from '../../../../../lib/server/request-security';
import {NextRequest,NextResponse} from 'next/server';
import {BusinessContextSchema} from '../../../../../lib/integrations/contracts';
import {currentUserId} from '../../../../../lib/server/auth';
export const runtime='nodejs';
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});if(process.env.ENABLE_ECOSYSTEM_INTEGRATION!=='true')return NextResponse.json({error:'Ecosystem bridge is disabled'},{status:503});const user=await currentUserId();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});try{const text=await req.text();if(text.length>20000)return NextResponse.json({error:'Payload too large'},{status:413});const parsed=BusinessContextSchema.safeParse(JSON.parse(text));if(!parsed.success)return NextResponse.json({error:'Invalid business context'},{status:400});return NextResponse.json({ok:true,context:parsed.data,mode:'validated-only',note:'No external application modified; context is not persisted yet'})}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}}
