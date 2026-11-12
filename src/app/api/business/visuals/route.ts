import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '../../../../lib/server/request-security';
import {discoverBusinessVisuals} from '../../../../lib/server/business-visuals';
import {licensedBusinessVisualAssets,specificVisualOfferings} from '../../../../lib/visual-assets';
const Input=z.object({industry:z.string().trim().min(2).max(100),offerings:z.array(z.string().trim().min(2).max(100)).max(3).optional()}).strict();
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Origin rejected'},{status:403});
 const raw=await request.text();if(raw.length>500)return NextResponse.json({error:'Request too large'},{status:413});
 try{const input=Input.parse(JSON.parse(raw));const offerings=specificVisualOfferings(input.offerings||[]);const results=await Promise.all([discoverBusinessVisuals(input.industry),...offerings.map(offering=>discoverBusinessVisuals(offering))]);const assets=licensedBusinessVisualAssets(input.industry,offerings,results.flat()).slice(0,24);return NextResponse.json({assets,notice:assets.length?'Niche- and offering-matched photos with verified no-attribution license metadata.':'No attribution-free images could be verified for the requested subjects.'},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Invalid visual research request'},{status:400})}
}
