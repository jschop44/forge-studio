/** Local-only default. Public binding requires explicit infrastructure opt-in. */
export function qualityWorkerBindHost(value?:string):'127.0.0.1'|'0.0.0.0'{
 if(!value||value==='127.0.0.1')return '127.0.0.1';
 if(value==='0.0.0.0')return '0.0.0.0';
 throw Error('Invalid quality worker binding');
}
