export class RequestBodyTooLarge extends Error{}
/** Bound raw UTF-8 before JSON parsing or signature verification; preserve exact text. */
export async function limitedRequestBody(request:Request,limit:number){
 if(Number(request.headers.get('content-length'))>limit){await request.body?.cancel();throw new RequestBodyTooLarge('Request exceeds limit')}
 const reader=request.body?.getReader();if(!reader)return '';
 const decoder=new TextDecoder('utf-8',{fatal:true});let bytes=0,text='';
 try{
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
   if(bytes>limit){await reader.cancel();throw new RequestBodyTooLarge('Request exceeds limit')}
   text+=decoder.decode(value,{stream:true});
  }
  return text+decoder.decode();
 }finally{reader.releaseLock()}
}
