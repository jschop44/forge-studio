import {NextRequest} from 'next/server';
export function sameOrigin(request:NextRequest):boolean{
 const origin=request.headers.get('origin');
 if(!origin)return false;
 try{const source=new URL(origin);const target=new URL(request.url);return source.origin===target.origin&&['https:','http:'].includes(source.protocol)}catch{return false}
}
