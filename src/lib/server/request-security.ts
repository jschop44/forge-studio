import {NextRequest} from 'next/server';
export function sameOrigin(request:NextRequest):boolean{
 const origin=request.headers.get('origin');
 if(!origin)return false;
 try{
  const source=new URL(origin);
  if(!['https:','http:'].includes(source.protocol))return false;
  const target=new URL(request.url);
  if(source.origin===target.origin)return true;
  const host=request.headers.get('host');
  if(source.protocol==='http:'&&target.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(source.hostname)&&source.host===host)return true;
  const configuredHost=process.env.RENDER_EXTERNAL_HOSTNAME;
  const allowedHosts=[host,configuredHost].filter((value):value is string=>Boolean(value));
  if(source.protocol==='https:'&&allowedHosts.some(value=>source.host===value))return true;
  return false;
 }catch{return false}
}
