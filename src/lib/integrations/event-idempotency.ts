/** Idempotent cross-app event replays must refer to exactly the same tenant and
 * business facts. Event IDs alone are not sufficient identity across tenants.
 */
export type SignedBusinessEvent={
 eventId:string;tenantId:string;source:'leadflow'|'growth-lens';
 businessName:string;website?:string;summary?:string;consent:true;
};
export function matchesAcceptedBusinessEvent(
 stored:{tenantId:unknown;source:unknown;payload:unknown},
 incoming:SignedBusinessEvent
):boolean{
 if(typeof stored.tenantId!=='string'||stored.tenantId.toLowerCase()!==incoming.tenantId.toLowerCase()||stored.source!==incoming.source)return false;
 let payload:unknown=stored.payload;
 if(typeof payload==='string'){try{payload=JSON.parse(payload)}catch{return false}}
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return false;
 const data=payload as Record<string,unknown>;
 return data.eventId===incoming.eventId
  &&data.businessName===incoming.businessName
  &&data.website===incoming.website
  &&data.summary===incoming.summary
  &&data.consent===true;
}
