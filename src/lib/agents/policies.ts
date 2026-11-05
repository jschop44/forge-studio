export const agentPolicy={
 maximumAttempts:3,maximumPayloadBytes:20000,automaticPublication:false,
 automaticOutreach:false,automaticPaidApiCalls:false,
 requireTenantConsent:true,requireHumanApprovalForPublicActions:true
} as const;
export function retryDelayMs(attempt:number){return Math.min(60000,1000*Math.pow(2,Math.max(0,Math.min(attempt,6))))}
