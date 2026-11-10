import {NextResponse} from 'next/server';
import {auditGeneratedDraft} from '../draft-quality-gate';
import type {AiGenerationResult} from './local-ai';

/** Validate every rendered page before returning a draft. This is static QA, not visual or publication approval. */
export function businessGenerationResponse(result:AiGenerationResult){
 const quality=auditGeneratedDraft(result.pages);
 if(!quality.readyForReview){
  const errors=quality.errors.slice(0,5);
  return NextResponse.json({error:'Generated website failed structural checks: '+errors.join('; '),quality:{...quality,errors}}, {status:422,headers:{'Cache-Control':'no-store'}});
 }
 return NextResponse.json({...result,quality},{headers:{'Cache-Control':'no-store'}});
}
