import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '../../../../lib/server/request-security';
import {generateWithLocalAi} from '../../../../lib/server/local-ai';
import {objectNavigationPlan} from '../../../../lib/website-experience';
import {isExcludedBusiness} from '../../../../lib/business-site';
export const runtime='nodejs';
const Input=z.object({experienceStyle:z.enum(['standard','cinematic','object-navigation']).optional(),businessName:z.string().trim().min(2).max(100),industry:z.string().trim().min(2).max(80),description:z.string().trim().min(15).max(1800),services:z.array(z.string().trim().min(2).max(100)).min(1).max(12),contactEmail:z.string().email().max(254).optional()});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 try{const raw=await req.text();if(raw.length>8000)return NextResponse.json({error:'Brief too large'},{status:413});
 let parsed:unknown;try{parsed=JSON.parse(raw)}catch{return NextResponse.json({error:'Malformed JSON request'},{status:400})}
 const input=Input.safeParse(parsed);if(!input.success)return NextResponse.json({error:'Invalid business brief'},{status:400});
 if(input.data.experienceStyle==='object-navigation'&&!objectNavigationPlan(input.data))return NextResponse.json({error:'Object navigation is available for coffee and baseball offerings that match the brief. Choose standard or cinematic for other businesses.'},{status:422});
 if(isExcludedBusiness(input.data))return NextResponse.json({error:'This business category is not supported'},{status:422});
 const result=await generateWithLocalAi(input.data);return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const detail=error instanceof Error?error.message:'';
  if(detail==='Local AI capacity exceeded')return NextResponse.json({error:'AI is busy. Please retry shortly.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':'5'}});
  const category=/HTTP 429/.test(detail)?'provider_rate_limited':/HTTP 40[13]/.test(detail)?'provider_auth':/HTTP 5\d\d/.test(detail)?'provider_server_error':/invalid draft|JSON/.test(detail)?'invalid_model_response':/abort|timeout/i.test(detail)?'provider_timeout':'provider_unavailable';
  console.error('Forge AI generation failure category:',category);
  return NextResponse.json({error:'Generation unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
