/** Live generation should not fail merely because optional browser compute is
 * asleep or unconfigured. Explicit strict mode remains available for customers
 * who require an independently verified inert-render review before delivery.
 */
export type BrowserGateStatus='passed'|'failed'|'unavailable'|'not-configured';
export function browserReviewGate(status:BrowserGateStatus,requireBrowserReview=false):{block:boolean;reason:'quality-failed'|'review-required'|null}{
 if(status==='failed')return {block:true,reason:'quality-failed'};
 if(requireBrowserReview&&status!=='passed')return {block:true,reason:'review-required'};
 return {block:false,reason:null};
}
