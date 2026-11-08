import {getCloudflareContext} from '@opennextjs/cloudflare';

/** Read request-time Worker bindings first; keep Node development/migrations supported. */
export function runtimeValue(name:string,nodeEnv:Record<string,string|undefined>=process.env,bindings:()=>Record<string,unknown>=()=>getCloudflareContext().env as unknown as Record<string,unknown>):string|undefined{
 try{const value=bindings()[name];if(typeof value==='string'&&value.length)return value;}catch{/* No Worker context during Node development, tests or migrations. */}
 return nodeEnv[name];
}
