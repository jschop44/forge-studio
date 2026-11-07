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
const elapsed=(performance.now()-start)/1000;
const sequential=results.reduce((sum,result)=>sum+result.seconds,0);
const improvement=sequential>0?100*(1-elapsed/sequential):0;
console.log('Parallel verification wall time '+elapsed.toFixed(1)+'s');
console.log('Measured verification stage speedup vs sum of individual job durations: '+improvement.toFixed(1)+'%');
if(process.env.GITHUB_STEP_SUMMARY){
 const {appendFileSync}=await import('node:fs');
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n### Parallel verification timing\n- Elapsed: '+elapsed.toFixed(1)+'s\n- Sum of individual check durations: '+sequential.toFixed(1)+'s\n- Stage time reduction: '+improvement.toFixed(1)+'%\n');
}
if(results.some(result=>result.code!==0))process.exitCode=1;
