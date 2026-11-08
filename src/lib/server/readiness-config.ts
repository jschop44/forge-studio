/** Report configuration names only; never include credentials or connection strings. */
export function readinessConfig(env:{DATABASE_URL?:string;AUTH_SECRET?:string}){
 const missing:string[]=[];
 if(!env.DATABASE_URL?.trim())missing.push('DATABASE_URL');
 if(!env.AUTH_SECRET||env.AUTH_SECRET.length<32)missing.push('AUTH_SECRET');
 return {configured:missing.length===0,missing};
}
