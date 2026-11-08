const knownCodes=['5007','5004','3039','3003','5018','5016','3023','3041','5035','5019','5005','3042','5028','3006','3007','3008','3036','3040'];
/** Structural reads also handle native/cross-realm errors. Never return provider text. */
export function summarizeAiError(error:unknown){
 const messages:string[]=[];
 let current=error,code='unknown';
 for(let depth=0;depth<3&&current;depth++){
  if(typeof current==='string'){messages.push(current.slice(0,5000));break}
  if(typeof current!=='object')break;
  const item=current as {message?:unknown;code?:unknown;cause?:unknown};
  if(typeof item.message==='string')messages.push(item.message.slice(0,5000));
  if(knownCodes.includes(String(item.code)))code=String(item.code);
  current=item.cause;
 }
 const message=messages.join(' ');
 if(code==='unknown')code=knownCodes.find(value=>new RegExp('\\b'+value+'\\b').test(message))||'unknown';
 const failureKind=code==='3036'||/quota|neurons|daily.*limit|allocation/i.test(message)?'quota_exceeded':code==='5035'?'paid_plan_required':/JSON Mode|json_schema|response_format|schema|invalid.*input|validation/i.test(message)?'schema_rejected':['5018','5016','3023','3041'].includes(code)||/unauthorized|authentication|permission|forbidden/i.test(message)?'provider_auth':['3007','3008'].includes(code)||/timeout|timed out|abort/i.test(message)?'provider_timeout':['5007','3042','5028'].includes(code)||/model.*(?:not found|unavailable|deprecated)/i.test(message)?'model_unavailable':code==='3040'?'provider_capacity':/fetch failed|network|connection/i.test(message)?'provider_network':'unknown';
 return {code,failureKind};
}
