/** Only known transient provider failures are retried. No private error text is stored. */
export function agentRetryDelay(error:unknown,attempt:number,maxAttempts:number):number|null{
 if(!(error instanceof Error)||!Number.isInteger(attempt)||!Number.isInteger(maxAttempts)||attempt<0||attempt>=maxAttempts)return null;
 const transient=error.message==='AUDIT_SOURCE_TRANSIENT'||error.message==='WORKERS_AI_PROVIDER_FAILURE'||error.message==='Local AI capacity exceeded'||(error.message.startsWith('Local AI unavailable:')&&/HTTP (429|5\d\d)|abort|timeout|fetch failed|ECONN|network/i.test(error.message));
 return transient?Math.min(3600,60*2**Math.min(attempt,6)):null;
}
