import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Missing values must never erase an existing Worker secret.
export function runtimeSecrets(env){
 const values={};
 for(const name of ['DATABASE_URL','AUTH_SECRET','FORGE_WORKER_SECRET','FORGE_INTEGRATION_SECRET']){
  const value=env[name];
  if(typeof value==='string'&&value.trim()){if(name==='FORGE_INTEGRATION_SECRET'&&value.trim().length<32)throw Error('FORGE_INTEGRATION_SECRET must contain at least 32 characters');values[name]=value;}
 }
 return values;
}
export function syncPreviewSecrets(env=process.env,run=spawnSync){
 const values=runtimeSecrets(env),names=Object.keys(values);
 if(!names.length){console.log('No runtime secrets supplied; existing Worker configuration is preserved. Database/auth readiness remains unverified.');return false;}
 // Never include secret values in arguments, errors, logs, or build artifacts.
 const result=run('npx',['wrangler','secret','bulk'],{env,input:JSON.stringify(values),encoding:'utf8',stdio:['pipe','pipe','pipe']});
 if(result.error||result.status!==0)throw Error('Preview secret sync failed; provider output suppressed to protect credentials');
 console.log('Synced runtime secret names: '+names.join(', ')+'. Live readiness must still be checked.');
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{syncPreviewSecrets()}catch(error){console.error(error.message);process.exitCode=1}
}
