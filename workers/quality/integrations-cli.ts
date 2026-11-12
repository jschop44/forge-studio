import {readFile,writeFile} from 'node:fs/promises';
import {captureWithCrawlee} from './capture';
import {generateComfyVisual} from './visual-generation';
import {auditForgePerformance} from './performance-audit';
import {qualityGraph} from './server';
const [kind,inputPath,outputPath]=process.argv.slice(2);
if(!inputPath||!outputPath)throw Error('Usage: integrations-cli.ts capture|visual|quality|performance input.json output.json');
const raw=await readFile(inputPath,'utf8');if(raw.length>1100000)throw Error('Job exceeds limit');
const input=JSON.parse(raw);let result:unknown;
switch(kind){
 case 'capture':result=await captureWithCrawlee(input.url,(process.env.FORGE_CAPTURE_HOSTS||'').split(',').filter(Boolean));break;
 case 'visual':result=await generateComfyVisual(input);break;
 case 'quality':{const state=await qualityGraph.invoke({pages:input.pages,findings:[],attempts:0},{recursionLimit:8});result={...state,passed:state.findings.length===0};break}
 case 'performance':result=await auditForgePerformance(input.path);break;
 default:throw Error('Unknown integration job');
}
await writeFile(outputPath,JSON.stringify(result,null,2),{mode:0o600});
console.log(JSON.stringify({job:kind,completed:true}));
