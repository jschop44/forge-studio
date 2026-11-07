import {NextRequest,NextResponse} from 'next/server';
import {SiteSchema} from '../../../lib/schema';
import {generateWithLocalAi} from '../../../lib/server/local-ai';

export const runtime='nodejs';
const limits=new Map<string,{count:number;reset:number}>();
export async function POST(req:NextRequest){
 // A client-supplied X-Forwarded-For value is not an authenticated identity.
 // Use the platform-provided connecting address where available, and a
 // conservative shared bucket otherwise to prevent header-based limit bypass.
 const ip=req.headers.get('x-real-ip')?.trim()||'shared';
 const now=Date.now();
 if(limits.size>2000){for(const [address,entry] of limits){if(entry.reset<=now)limits.delete(address)}}
 const limit=limits.get(ip);
 if(limit&&limit.reset>now&&limit.count>=10)return NextResponse.json({error:'Rate limit exceeded. Try again later.'},{status:429});
 let body:unknown;
 try{body=await req.json()}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 if(!body||typeof body!=='object')return NextResponse.json({error:'Invalid request'},{status:400});
 const {name,description,template,industry,services}=body as Record<string,unknown>;
 if(typeof name!=='string'||typeof description!=='string'||name.trim().length<2||name.length>80||description.trim().length<15||description.length>1500||!['ember','minimal','editorial'].includes(String(template))||(industry!==undefined&&(typeof industry!=='string'||industry.length>80))||(services!==undefined&&(!Array.isArray(services)||services.length>12||services.some(item=>typeof item!=='string'||item.length<2||item.length>100))))return NextResponse.json({error:'Invalid input'},{status:400});
 limits.set(ip,{count:limit&&limit.reset>now?limit.count+1:1,reset:limit&&limit.reset>now?limit.reset:now+3600000});
 try{
  const result=await generateWithLocalAi({businessName:name,industry:typeof industry==='string'&&industry.trim()?industry.trim():'Business',description,services:Array.isArray(services)&&services.length?services as string[]:['General services']});
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
