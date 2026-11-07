import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '../../../../lib/server/request-security';
import {generateWithLocalAi} from '../../../../lib/server/local-ai';
import {isExcludedBusiness} from '../../../../lib/business-site';
export const runtime='nodejs';
const Input=z.object({businessName:z.string().trim().min(2).max(100),industry:z.string().trim().min(2).max(80),description:z.string().trim().min(15).max(1800),services:z.array(z.string().trim().min(2).max(100)).min(1).max(12),contactEmail:z.string().email().max(254).optional()});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 try{const raw=await req.text();if(raw.length>8000)return NextResponse.json({error:'Brief too large'},{status:413});
 const input=Input.safeParse(JSON.parse(raw));if(!input.success)return NextResponse.json({error:'Invalid business brief'},{status:400});
 if(isExcludedBusiness(input.data))return NextResponse.json({error:'This business category is not supported'},{status:422});
 const result=await generateWithLocalAi(input.data);return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Generation unavailable'},{status:503})}
}
