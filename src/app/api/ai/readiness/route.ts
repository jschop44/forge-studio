import {NextResponse} from 'next/server';
import {checkLocalAiReadiness} from '../../../../lib/server/local-ai';
export const runtime='nodejs';
export async function GET(){
 const status=await checkLocalAiReadiness();
 return NextResponse.json(status,{headers:{'Cache-Control':'no-store'}});
}
