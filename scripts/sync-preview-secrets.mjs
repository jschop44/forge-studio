import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Missing values must never erase an existing Worker secret.
export function runtimeSecrets(env){
 const values={};
 for(const name of ['DATABASE_URL','AUTH_SECRET','FORGE_WORKER_SECRET','FORGE_INTEGRATION_SECRET','FORGE_QUALITY_WORKER_URL','FORGE_QUALITY_WORKER_SECRET','PEXELS_API_KEY','FORGE_DESIGN_ADVISOR','DIFY_WORKFLOW_URL','DIFY_API_KEY','FLOWISE_PREDICTION_URL','FLOWISE_API_KEY','ACTIVEPIECES_WEBHOOK_URL','ACTIVEPIECES_WEBHOOK_TOKEN']){
  const value=env[name];
  if(typeof value==='string'&&value.trim()){if(name==='FORGE_INTEGRATION_SECRET'&&value.trim().length<32)throw Error('FORGE_INTEGRATION_SECRET must contain at least 32 characters');values[name]=value;}
 }
 return values;
}
const sleepSync=ms=>{Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)};
export function syncPreviewSecrets(env=process.env,run=spawnSync,pause=sleepSync){
 const values=runtimeSecrets(env),names=Object.keys(values);
 if(!names.length){console.log('No runtime secrets supplied; existing Worker configuration is preserved. Database/auth readiness remains unverified.');return false;}
 // Retrying transient provider failures is bounded to three identical, idempotent sync attempts.
 // Never include secret values or provider output in arguments, errors, logs, or build artifacts.
 const delays=[800,1600];
 for(let attempt=0;attempt<=delays.length;attempt++){
  const result=run('npx',['wrangler','secret','bulk'],{env,input:JSON.stringify(values),encoding:'utf8',stdio:['pipe','pipe','pipe']});
  if(!result.error&&result.status===0){
   console.log('Synced runtime secret names: '+names.join(', ')+'. Live readiness must still be checked.');
   return true;
  }
  if(attempt<delays.length){
   console.warn('Preview secret sync attempt '+(attempt+1)+' failed; retrying without exposing provider output.');
   pause(delays[attempt]);
  }
 }
 throw Error('Preview secret sync failed after 3 attempts; provider output suppressed to protect credentials');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{syncPreviewSecrets()}catch(error){console.error(error.message);process.exitCode=1}
}
