import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '../../../lib/server/request-security';
import {DESIGN_PATTERNS,planAdaptiveDesign} from '../../../lib/design-engine';
export const runtime='nodejs';
const Input=z.object({businessName:z.string().trim().min(2).max(100),industry:z.string().trim().min(2).max(80),mode:z.enum(['auto','library']).default('auto'),patternId:z.string().max(80).optional(),immersive3d:z.boolean().default(true)});
export async function GET(){
 return NextResponse.json({version:1,defaultMode:'auto',defaultDirection:'adaptive',patterns:DESIGN_PATTERNS},{headers:{'Cache-Control':'public, max-age=300'}});
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Origin rejected'},{status:403});
 const length=Number(request.headers.get('content-length')||0);
 if(length>4096)return NextResponse.json({error:'Request too large'},{status:413});
 let body:unknown;
 try{const raw=await request.text();if(raw.length>4096)return NextResponse.json({error:'Request too large'},{status:413});body=JSON.parse(raw)}
 catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 const parsed=Input.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:'Invalid design brief'},{status:400});
 try{return NextResponse.json({version:1,decision:planAdaptiveDesign(parsed.data),generationPerformed:false},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({error:'Unknown design pattern'},{status:422})}
}
