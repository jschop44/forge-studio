import {NextRequest,NextResponse} from 'next/server';
import {BusinessContextSchema} from '../../../../lib/integrations/contracts';
import {analyzeContext} from '../../../../lib/intelligence';
import {currentUserId} from '../../../../lib/server/auth';
import {sameOrigin} from '../../../../lib/server/request-security';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(process.env.ENABLE_ECOSYSTEM_INTEGRATION!=='true')return NextResponse.json({error:'Integration disabled'},{status:503});
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 if(!await currentUserId())return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const body=await req.text();if(body.length>20000)return NextResponse.json({error:'Too large'},{status:413});
 const result=BusinessContextSchema.safeParse(JSON.parse(body));if(!result.success)return NextResponse.json({error:'Invalid context'},{status:400});
 return NextResponse.json({analysis:analyzeContext(result.data)})}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
