import {CompositionSchema,compositionInstruction,compositionJsonSchema,parseAiComposition} from '../ai-composition';
export type WorkersAiBinding={run:(model:string,input:Record<string,unknown>)=>Promise<unknown>};
/** Native JSON mode returns either a parsed object or a JSON string. Validate both. */
export async function generateWorkersComposition(ai:WorkersAiBinding,input:Record<string,unknown>){
 const response=await ai.run('@cf/meta/llama-3.1-8b-instruct',{
  messages:[{role:'system',content:compositionInstruction},{role:'user',content:JSON.stringify(input)}],
  response_format:{type:'json_schema',json_schema:compositionJsonSchema},max_tokens:360,temperature:0.3
 });
 const result=response&&typeof response==='object'?response as {response?:unknown;output?:unknown}:{};
 const value=result.response??result.output;
 try{
  return typeof value==='string'?parseAiComposition(value):CompositionSchema.parse(value);
 }catch{throw Error('Workers AI returned invalid composition')}
}
