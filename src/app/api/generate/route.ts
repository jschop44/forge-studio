import {NextRequest,NextResponse} from 'next/server';
import {SiteSchema} from '../../../lib/schema';
import {z} from 'zod';
import {generateWithLocalAi} from '../../../lib/server/local-ai';
import {sameOrigin} from '../../../lib/server/request-security';
import {isExcludedBusiness} from '../../../lib/business-site';

export const runtime='nodejs';
const limits=new Map<string,{count:number;reset:number}>();
const LegacyBrief=z.object({name:z.string().trim().min(2).max(80),description:z.string().trim().min(15).max(1500),template:z.enum(['ember','minimal','editorial']),industry:z.string().trim().min(2).max(80).optional(),services:z.array(z.string().trim().min(2).max(100)).min(1).max(12).optional()});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 const length=Number(req.headers.get('content-length')||0);
 if(length>8000)return NextResponse.json({error:'Brief too large'},{status:413});
 // A client-supplied X-Forwarded-For value is not an authenticated identity.
 // Use the platform-provided connecting address where available, and a
 // conservative shared bucket otherwise to prevent header-based limit bypass.
 const ip=req.headers.get('x-real-ip')?.trim()||'shared';
 const now=Date.now();
 if(limits.size>2000){for(const [address,entry] of limits){if(entry.reset<=now)limits.delete(address)}}
 const limit=limits.get(ip);
 if(limit&&limit.reset>now&&limit.count>=10)return NextResponse.json({error:'Rate limit exceeded. Try again later.'},{status:429});
 let body:unknown;
 try{const raw=await req.text();if(raw.length>8000)return NextResponse.json({error:'Brief too large'},{status:413});body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 if(!body||typeof body!=='object')return NextResponse.json({error:'Invalid request'},{status:400});
 const parsed=LegacyBrief.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:'Invalid input'},{status:400});
 const {name,description,template,industry,services}=parsed.data;
 const brief={businessName:name,industry:industry||'Business',description,services:services||['General services']};
 if(isExcludedBusiness(brief))return NextResponse.json({error:'This business category is not supported'},{status:422});
 limits.set(ip,{count:limit&&limit.reset>now?limit.count+1:1,reset:limit&&limit.reset>now?limit.reset:now+3600000});
 try{
  const result=await generateWithLocalAi(brief);
  const draft=result.draft;
  const site=SiteSchema.parse({
   id:crypto.randomUUID(),
   name:draft.businessName,
   tagline:'Discover '+draft.businessName,
   description:draft.description,
   accent:template==='ember'?'#ff6846':template==='minimal'?'#9de2d0':'#dbb5ff',
   template,
   cta:'Get in touch',
   sections:draft.services.map((service,index)=>({id:'service-'+(index+1),title:service,body:draft.description}))
  });
  return NextResponse.json({site});
 }catch{return NextResponse.json({error:'Local AI is unavailable or returned invalid content.'},{status:503})}
}
