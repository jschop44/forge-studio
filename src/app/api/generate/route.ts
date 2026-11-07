import {NextRequest,NextResponse} from 'next/server';
import {SiteSchema} from '../../../lib/schema';
import {generateWithLocalAi} from '../../../lib/server/local-ai';

export const runtime='nodejs';
const limits=new Map<string,{count:number;reset:number}>();
export async function POST(req:NextRequest){
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const now=Date.now();
 if(limits.size>2000){for(const [address,entry] of limits){if(entry.reset<=now)limits.delete(address)}if(limits.size>2000)limits.clear()}
 const limit=limits.get(ip);
 if(limit&&limit.reset>now&&limit.count>=10)return NextResponse.json({error:'Rate limit exceeded. Try again later.'},{status:429});
 let body:unknown;
 try{body=await req.json()}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 if(!body||typeof body!=='object')return NextResponse.json({error:'Invalid request'},{status:400});
 const {name,description,template}=body as Record<string,unknown>;
 if(typeof name!=='string'||typeof description!=='string'||name.trim().length<2||name.length>80||description.trim().length<15||description.length>1500||!['ember','minimal','editorial'].includes(String(template)))return NextResponse.json({error:'Invalid input'},{status:400});
 limits.set(ip,{count:limit&&limit.reset>now?limit.count+1:1,reset:limit&&limit.reset>now?limit.reset:now+3600000});
 try{
  const result=await generateWithLocalAi({businessName:name,industry:'Creative studio',description,services:['Website design']});
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
