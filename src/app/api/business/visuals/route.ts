import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '../../../../lib/server/request-security';
import {discoverBusinessVisuals} from '../../../../lib/server/business-visuals';
const Input=z.object({industry:z.string().trim().min(3).max(100)}).strict();
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Origin rejected'},{status:403});
 const raw=await request.text();if(raw.length>500)return NextResponse.json({error:'Request too large'},{status:413});
 try{const input=Input.parse(JSON.parse(raw));const assets=await discoverBusinessVisuals(input.industry);return NextResponse.json({assets,notice:assets.length?'Niche-matched images with source and license metadata.':'No suitable images could be verified. Supply business imagery rather than using an unrelated substitute.'},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Invalid visual research request'},{status:400})}
}
