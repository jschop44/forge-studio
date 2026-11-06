import {NextRequest} from 'next/server';
export function sameOrigin(request:NextRequest):boolean{
 const origin=request.headers.get('origin');
 if(!origin)return false;
 try{
  const source=new URL(origin);
  if(!['https:','http:'].includes(source.protocol))return false;
  const target=new URL(request.url);
  if(source.origin===target.origin)return true;
  const forwardedHost=request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host=request.headers.get('host');
  const allowedHosts=[forwardedHost,host,process.env.RENDER_EXTERNAL_HOSTNAME].filter((value):value is string=>Boolean(value));
  if(source.protocol==='https:'&&allowedHosts.some(value=>source.host===value))return true;
  return false;
 }catch{return false}
}
