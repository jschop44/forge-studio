import {pathToFileURL} from 'node:url';
import {verifyDeployedRevision} from './verify-deployed-revision.mjs';
/** Edge propagation can briefly serve a healthy previous revision. Never approve it. */
export async function waitForDeployedRevision(expected,{fetcher=fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=6}={}){
 if(!/^[a-f0-9]{40}$/.test(expected||''))throw Error('Expected a full verified commit SHA');
 if(!Number.isInteger(attempts)||attempts<1||attempts>6)throw Error('Invalid verification attempt budget');
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const url=new URL('https://forge-studio-preview.stands-old-3h.workers.dev/api/health');url.searchParams.set('revision',expected);url.searchParams.set('attempt',String(attempt));
   const response=await fetcher(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!response.ok){await response.body?.cancel();throw Error('Health unavailable')}
   const raw=await response.text();if(raw.length>4096)throw Error('Invalid health response');
   return verifyDeployedRevision(JSON.parse(raw),expected);
  }catch{if(attempt===attempts-1)throw Error('Live deployment did not report the verified revision within the bounded propagation window')}
  await pause(3000);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const revision=await waitForDeployedRevision(process.env.FORGE_EXPECTED_REVISION);
 console.log('Live source revision verified: '+revision);
}
