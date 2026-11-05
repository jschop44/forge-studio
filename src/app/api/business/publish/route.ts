import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {database} from '../../../../lib/server/db';
import {currentUserId} from '../../../../lib/server/auth';
import {sameOrigin} from '../../../../lib/server/request-security';
import {generateBusinessWebsite} from '../../../../lib/business-site';
import {auditGeneratedSite} from '../../../../lib/site-audit';
const Input=z.object({businessName:z.string().trim().min(2).max(100),industry:z.string().trim().min(2).max(80),description:z.string().trim().min(15).max(1800),services:z.array(z.string().trim().min(2).max(100)).min(1).max(12),contactEmail:z.string().email().optional(),approved:z.literal(true)});
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 if(process.env.ENABLE_PUBLISHING!=='true')return NextResponse.json({error:'Publishing disabled'},{status:503});
 const user=await currentUserId();if(!user)return NextResponse.json({error:'Sign in before publishing'},{status:401});
 try{const raw=await req.text();if(raw.length>8000)return NextResponse.json({error:'Brief too large'},{status:413});
 const parsed=Input.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Invalid or unapproved brief'},{status:400});
 const site=generateBusinessWebsite(parsed.data);
 for(const page of site.pages){const quality=auditGeneratedSite({html:page.html});if(quality.score<50)return NextResponse.json({error:'Page failed quality gate',page:page.slug,quality},{status:422})}
 const sql=database(),id=crypto.randomUUID();
 for(const page of site.pages){const html=page.html.replaceAll('href="index.html"','href="/business-sites/'+id+'/index"').replaceAll('href="services.html"','href="/business-sites/'+id+'/services"').replaceAll('href="about.html"','href="/business-sites/'+id+'/about"').replaceAll('href="contact.html"','href="/business-sites/'+id+'/contact"');
 await sql`INSERT INTO forge_business_publications(id,owner_id,slug,html) VALUES(${id}::uuid,${user}::uuid,${page.slug},${html})`;}
 return NextResponse.json({url:'/business-sites/'+id+'/index',id,pages:site.pages.map(p=>p.slug)},{status:201});
 }catch{return NextResponse.json({error:'Publishing unavailable'},{status:503})}
}
