import {pathToFileURL} from 'node:url';
const workerUrl='https://forge-studio-preview.stands-old-3h.workers.dev/api/agents/worker';
export async function drainAgentQueue(env=process.env,fetcher=fetch){
 if(env.FORGE_WORKER_URL!==workerUrl)throw Error('Worker URL must match the existing Forge preview endpoint');
 if(!env.FORGE_WORKER_SECRET||env.FORGE_WORKER_SECRET.length<32)throw Error('Worker secret is missing or invalid');
 const batches=[];
 for(let batch=0;batch<6;batch++){
  const response=await fetcher(workerUrl,{method:'POST',redirect:'error',headers:{'x-forge-worker-key':env.FORGE_WORKER_SECRET},signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('Worker request failed with HTTP '+response.status);
  const data=await response.json();
  if(!Number.isInteger(data.processed)||data.processed<0||data.processed>20||!Array.isArray(data.results)||data.results.length!==data.processed||data.results.some(r=>!['completed','needs-approval','blocked','claim-lost','retry-scheduled'].includes(r.status)))throw Error('Invalid worker result');
  const statuses=data.results.map(r=>r.status);batches.push({processed:data.processed,statuses});
  // Every claimed row is one bounded unit of work, even when it is blocked,
  // retry-scheduled or waiting for owner approval. Those outcomes never grant
  // approval, but they also must not starve unrelated pending jobs.
  // Stop only once the authenticated worker reports that no job was claimed.
  if(data.processed===0)return {batches,stopped:'idle-or-gated'};
 }
 return {batches,stopped:'batch-limit'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 drainAgentQueue().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1});
}
