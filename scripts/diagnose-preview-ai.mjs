import {spawn} from 'node:child_process';
const origin='https://forge-studio-preview.stands-old-3h.workers.dev';
const child=spawn('npx',['wrangler','tail','forge-studio-preview','--format','json','--sampling-rate','1'],{stdio:['ignore','pipe','pipe'],env:process.env,detached:true});
let output='',tailReady=false,tailFailed=false;
const observe=chunk=>{if(/Connected to|Successfully created tail/i.test(chunk.toString()))tailReady=true};
child.stdout.on('data',chunk=>{observe(chunk);output=(output+chunk.toString()).slice(-1000000)});
// Tail output may contain unrelated request metadata. Never forward raw output or errors.
child.stderr.on('data',observe);
child.on('error',()=>{tailFailed=true});
child.on('exit',()=>{tailFailed=true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 // npx startup may exceed seven seconds. Wait for an actual subscription.
 const deadline=Date.now()+45000;
 while(!tailReady&&!tailFailed&&Date.now()<deadline)await wait(250);
 if(!tailReady)throw Error('Diagnostic log subscription did not become ready; no inference request was sent');
 const response=await fetch(origin+'/api/ai/business',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({businessName:'Forge Diagnostic Studio',industry:'Design',description:'An independent studio designing accessible websites for local businesses.',services:['Website design']}),signal:AbortSignal.timeout(90000)});
 console.log(JSON.stringify({syntheticRequestStatus:response.status}));
 await wait(5000);
}finally{try{process.kill(-child.pid,'SIGTERM')}catch{}}
// Wrangler JSON events can span lines. Parse balanced JSON without printing event bodies.
let depth=0,start=-1,quoted=false,escaped=false;
const categories=[];
for(let i=0;i<output.length;i++){
 const c=output[i];
 if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
 if(c==='"'){quoted=true;continue}
 if(c==='{'){if(depth===0)start=i;depth++}
 if(c==='}'&&depth>0&&--depth===0){
  try{
   const event=JSON.parse(output.slice(start,i+1));
   for(const log of event.logs||[]){
    if(log.message?.[0]==='Forge AI generation failure category:'){
     const category=log.message[1];
     if(['provider_rate_limited','provider_auth','provider_server_error','invalid_model_response','provider_timeout','provider_unavailable'].includes(category))categories.push({category});
    }
    if(log.message?.[0]!=='Workers AI inference failed')continue;
    const data=log.message[1];
    const item=typeof data==='string'?JSON.parse(data):data;
    categories.push({code:/^\d{1,8}$/.test(String(item?.code))?String(item.code):'unknown',category:['provider_failure','invalid_model_response'].includes(item?.category)?item.category:'unknown'});
   }
  }catch{/* Never print malformed provider/event content. */}
 }
}
console.log(JSON.stringify({tailReady,providerDiagnostics:categories,rawEventsDisclosed:false}));
if(!categories.length)throw Error('No provider diagnostics captured; inference failure remains unresolved');
