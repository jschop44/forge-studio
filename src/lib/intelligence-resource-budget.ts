/** Free-tier resource planning for independent intelligence tasks.
 * Pure module: no credentials, no external calls, no provider-specific bypass.
 */
export type Workload='metadata'|'sitemap'|'render'|'visual'|'generation'|'qa';
export type ResourceBudget={concurrency:number;timeoutMs:number;maxAttempts:number;cacheTtlSeconds:number};
const budgets:Record<Workload,ResourceBudget>={
 metadata:{concurrency:4,timeoutMs:8000,maxAttempts:2,cacheTtlSeconds:3600},
 sitemap:{concurrency:2,timeoutMs:3500,maxAttempts:1,cacheTtlSeconds:21600},
 render:{concurrency:1,timeoutMs:20000,maxAttempts:1,cacheTtlSeconds:3600},
 visual:{concurrency:1,timeoutMs:15000,maxAttempts:1,cacheTtlSeconds:86400},
 generation:{concurrency:2,timeoutMs:30000,maxAttempts:2,cacheTtlSeconds:0},
 qa:{concurrency:2,timeoutMs:20000,maxAttempts:1,cacheTtlSeconds:0}
};
export function resourceBudget(workload:Workload):ResourceBudget{return {...budgets[workload]}}
export function stableCacheKey(workload:Workload,origin:string,path='/'):string{
 const url=new URL(path,origin);
 if(url.protocol!=='https:')throw Error('HTTPS required');
 url.hash='';
 url.searchParams.sort();
 return workload+':'+url.origin+url.pathname+url.search;
}
export function shouldRetry(status:number,attempt:number,workload:Workload):boolean{
 return attempt<budgets[workload].maxAttempts-1&&(status===429||status===502||status===503||status===504);
}
