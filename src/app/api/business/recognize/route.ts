import {limitedRequestBody,RequestBodyTooLarge} from '../../../../lib/server/limited-request-body';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '../../../../lib/server/request-security';
import {recognizeBusinessWithLocalAi} from '../../../../lib/server/local-ai';
export const runtime='nodejs';
const Input=z.object({businessName:z.string().trim().min(2).max(100),brief:z.string().trim().max(1800)}).strict();
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Origin rejected'},{status:403});
 let raw:string;try{raw=await limitedRequestBody(request,16*1024)}catch(error){return NextResponse.json({error:error instanceof RequestBodyTooLarge?'Business information exceeds the 16 KB limit.':'Invalid request body'},{status:error instanceof RequestBodyTooLarge?413:400})}
 let input:z.infer<typeof Input>;
 try{input=Input.parse(JSON.parse(raw))}catch{return NextResponse.json({error:'Invalid business information'},{status:400})}
 try{return NextResponse.json(await recognizeBusinessWithLocalAi(input),{headers:{'Cache-Control':'no-store'}})}catch(error){return NextResponse.json({error:'Business recognition temporarily unavailable'},{status:error instanceof Error&&error.message==='Local AI capacity exceeded'?429:503,headers:{'Cache-Control':'no-store'}})}
}
