import {limitedRequestBody,RequestBodyTooLarge} from '../../../../lib/server/limited-request-body';
import {BUSINESS_GENERATION_MAX_BYTES} from '../../../../lib/business-generation-payload';
import {VisualAssetSchema} from '../../../../lib/visual-assets';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '../../../../lib/server/request-security';
import {generateWithLocalAi} from '../../../../lib/server/local-ai';
import {businessGenerationResponse} from '../../../../lib/server/business-generation-response';
import {objectNavigationPlan} from '../../../../lib/website-experience';
import {isExcludedBusiness} from '../../../../lib/business-site';
import {planAdaptiveDesign} from '../../../../lib/design-engine';
export const runtime='nodejs';
const Input=z.object({designMode:z.enum(['new','inspired','redesign']).optional(),visualDesignMode:z.enum(['auto','library']).optional(),designPatternId:z.string().trim().max(80).optional(),immersive3d:z.boolean().optional(),experienceStyle:z.enum(['standard','cinematic','object-navigation','immersive']).optional(),businessName:z.string().trim().min(2).max(100),industry:z.string().trim().min(2).max(80),description:z.string().trim().min(15).max(1800),services:z.array(z.string().trim().min(2).max(100)).min(1).max(12),visualAssets:z.array(VisualAssetSchema).max(12).optional(),contactEmail:z.string().email().max(254).optional()});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 try{const raw=await limitedRequestBody(req,BUSINESS_GENERATION_MAX_BYTES);
 let parsed:unknown;try{parsed=JSON.parse(raw)}catch{return NextResponse.json({error:'Malformed JSON request'},{status:400})}
 const input=Input.safeParse(parsed);if(!input.success)return NextResponse.json({error:'Invalid business brief'},{status:400});
 if(input.data.experienceStyle==='object-navigation'&&!objectNavigationPlan(input.data))return NextResponse.json({error:'Add at least one business offering for interactive navigation.'},{status:422});
 if(isExcludedBusiness(input.data))return NextResponse.json({error:'This business category is not supported'},{status:422});
 const {designMode:_sourceMode,visualDesignMode,designPatternId,immersive3d,...generationInput}=input.data;
 const design=planAdaptiveDesign({businessName:input.data.businessName,industry:input.data.industry,mode:visualDesignMode||'auto',patternId:designPatternId,immersive3d:immersive3d??false});
 // Existing callers retain their explicit experience style. The new design
 // options opt into immersive or cinematic generation when supported.
 const experienceStyle=generationInput.experienceStyle||(immersive3d===true&&design.immersive3d?'immersive':design.motion==='cinematic'&&visualDesignMode?'cinematic':'standard');
 const result=await generateWithLocalAi({...generationInput,experienceStyle});
 const response=businessGenerationResponse(result);
 if(!response.ok)return response;
 const payload=await response.json();
 return NextResponse.json({...payload,designDecision:design},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(error instanceof RequestBodyTooLarge)return NextResponse.json({error:'Website brief exceeds the 64 KB limit. Shorten the description or remove extra image references.'},{status:413});
  const detail=error instanceof Error?error.message:'';
  if(detail==='Unknown design pattern')return NextResponse.json({error:'Unknown design pattern'},{status:422});
  if(detail==='Local AI capacity exceeded')return NextResponse.json({error:'AI is busy. Please retry shortly.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':'5'}});
  const category=/HTTP 429/.test(detail)?'provider_rate_limited':/HTTP 40[13]/.test(detail)?'provider_auth':/HTTP 5\d\d/.test(detail)?'provider_server_error':/invalid draft|JSON/.test(detail)?'invalid_model_response':/abort|timeout/i.test(detail)?'provider_timeout':'provider_unavailable';
  console.error('Forge AI generation failure category:',category);
  return NextResponse.json({error:'Generation unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
