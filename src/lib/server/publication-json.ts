import {limitedRequestBody,RequestBodyTooLarge} from './limited-request-body';

// Twenty bounded pages fit ordinary exports while total parsing memory is capped.
export const PUBLICATION_BODY_LIMIT=8*1024*1024;
export const ROLLBACK_BODY_LIMIT=4096;
export class PublicationJsonError extends Error{
 constructor(message:string,public readonly status:400|413){super(message)}
}
/** Enforce a raw byte budget even for chunked requests before JSON parsing. */
export async function publicationJson(request:Request,limit=PUBLICATION_BODY_LIMIT):Promise<unknown>{
 let raw:string;
 try{raw=await limitedRequestBody(request,limit)}catch(error){
  if(error instanceof RequestBodyTooLarge)throw new PublicationJsonError('Publication request exceeds the size limit',413);
  if(error instanceof TypeError)throw new PublicationJsonError('Publication request must contain valid UTF-8 JSON',400);
  throw error;
 }
 try{return JSON.parse(raw)}catch{throw new PublicationJsonError('Publication request must contain valid JSON',400)}
}
