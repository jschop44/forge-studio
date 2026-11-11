import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

// Local production-build acceptance only. No database, sessions or publication writes.
async function server(enabled){
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','0'],{
  env:{...process.env,ENABLE_BUSINESS_PUBLISHING:enabled,FORCE_COLOR:'0'},stdio:['ignore','pipe','pipe']
 });
 let output='';child.stdout.on('data',chunk=>{output=(output+chunk).slice(-8000)});
 child.stderr.resume();
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){
  const url=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  if(url){try{const response=await fetch(url+'/api/health');if(response.ok)return {child,url}}catch{}}
  if(child.exitCode!==null)break;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 child.kill('SIGTERM');throw Error('Local production server did not become ready');
}
let assertions=0;
for(const enabled of ['false','true']){
 const {child,url}=await server(enabled);
 try{
  const id='00000000-0000-4000-8000-000000000001';
  for(const [path,method] of [
   ['/api/business/publish','POST'],['/api/business/publish','GET'],
   ['/api/business/publish/'+id,'DELETE'],
   ['/api/business/publish/'+id+'/revisions','POST'],
   ['/api/business/publish/'+id+'/rollback','POST'],
   ['/api/business/publish/'+id+'/versions','GET']
  ]){
   const response=await fetch(url+path,{method,headers:{Origin:url,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
   assert.equal(response.status,enabled==='true'?401:503,method+' '+path+' opt-in/session gate');assertions++;
  }
  const publicPage=await fetch(url+'/business-sites/not-a-uuid/index');
  assert.equal(publicPage.status,enabled==='true'?404:503);assertions++;
  if(enabled==='false')assert.equal(publicPage.headers.get('cache-control'),'no-store');
  const rejected=await fetch(url+'/api/business/publish',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:'{}'});
  assert.equal(rejected.status,403,'origin protection stays active');assertions++;
 }finally{
  if(child.exitCode===null&&child.signalCode===null){
   const exited=once(child,'exit');child.kill('SIGTERM');
   const forced=setTimeout(()=>child.kill('SIGKILL'),5000);forced.unref();
   try{await exited}finally{clearTimeout(forced)}
  }
 }
}
console.log(`Publishing route acceptance: ${assertions}/${assertions} opt-in, authorization and origin checks passed against the local production build. No sites were persisted.`);
