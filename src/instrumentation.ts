/**
 * Best-effort in-process queue wake-up for always-on Node deployments.
 * On sleeping free hosts, execution pauses; use an external scheduler for strict SLAs.
 */
export async function register(){
 if(process.env.NEXT_RUNTIME!=='nodejs'||process.env.ENABLE_AGENT_AUTOPILOT!=='true')return;
 const secret=process.env.FORGE_WORKER_SECRET;
 if(!secret||secret.length<32)return;
 const port=Number(process.env.PORT||3000);
 if(!Number.isInteger(port)||port<1||port>65535)return;
 let running=false;
 const tick=async()=>{if(running)return;running=true;try{await fetch('http://127.0.0.1:'+port+'/api/agents/worker',{method:'POST',headers:{'x-forge-worker-key':secret},signal:AbortSignal.timeout(20000)})}catch{}finally{running=false}};
 setTimeout(async()=>{try{const r=await fetch('http://127.0.0.1:'+port+'/api/health/ready',{signal:AbortSignal.timeout(10000)});console.info('Forge readiness smoke test',r.status);if(r.ok){const worker=await fetch('http://127.0.0.1:'+port+'/api/agents/worker',{method:'POST',headers:{'x-forge-worker-key':secret},signal:AbortSignal.timeout(10000)});console.info('Forge agent worker smoke test',worker.status)}}catch{console.warn('Forge readiness smoke test unavailable')}},15000).unref();
 const timer=setInterval(()=>{void tick()},120000);timer.unref();
}
