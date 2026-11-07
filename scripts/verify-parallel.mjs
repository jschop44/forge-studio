import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const jobs=[
 ['policy',process.execPath,['scripts/verify-free-ai.mjs']],
 ['unit',process.platform==='win32'?'npm.cmd':'npm',['test']],
 ['workers',process.platform==='win32'?'npm.cmd':'npm',['run','test:workers']],
 ['types',process.platform==='win32'?'npm.cmd':'npm',['run','typecheck']]
];
const start=performance.now();
const results=await Promise.all(jobs.map(([name,command,args])=>new Promise(resolve=>{
 const began=performance.now();
 const child=spawn(command,args,{stdio:['ignore','pipe','pipe'],env:process.env});
 let output='';
 for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk.toString();if(output.length>1000000)output=output.slice(-1000000)});
 child.on('error',error=>resolve({name,code:1,seconds:(performance.now()-began)/1000,output:String(error)}));
 child.on('close',code=>resolve({name,code:code??1,seconds:(performance.now()-began)/1000,output}));
})));
for(const result of results){
 console.log('['+result.name+'] '+(result.code===0?'PASS':'FAIL')+' '+result.seconds.toFixed(1)+'s');
 if(result.code!==0)console.error(result.output.slice(-12000));
}
console.log('Parallel verification wall time '+((performance.now()-start)/1000).toFixed(1)+'s');
if(results.some(result=>result.code!==0))process.exitCode=1;
