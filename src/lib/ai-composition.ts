import {z} from 'zod';
export const DesignSchema=z.object({layout:z.enum(['editorial','image-led']),palette:z.enum(['sand','mint','sky'])}).strict();
export const CompositionSchema=z.object({description:z.string().trim().min(15).max(1800),design:DesignSchema}).strict();
export const compositionJsonSchema={type:'object',properties:{description:{type:'string',minLength:15,maxLength:1800},design:{type:'object',properties:{layout:{type:'string',enum:['editorial','image-led']},palette:{type:'string',enum:['sand','mint','sky']}},required:['layout','palette'],additionalProperties:false}},required:['description','design'],additionalProperties:false};
export const compositionInstruction='Return ONLY a JSON object with description and design. Write a concise professional business description (15-1800 characters) using only supplied facts. Do not invent claims, prices, testimonials or credentials. Choose design.layout: editorial (text followed by imagery) or image-led (text and imagery side by side on desktop). Choose design.palette: sand, mint or sky. Match the supplied business audience. For retail, equipment and memorabilia businesses, describe browsing products and asking about availability; do not describe customers discussing projects or invent a checkout, inventory, prices or authenticity guarantees. No HTML, scripts, CSS or additional keys.';
export function parseAiComposition(raw:string){
 if(raw.length>5000)throw Error('Invalid model composition');
 const clean=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 try{return CompositionSchema.parse(JSON.parse(clean))}catch{throw Error('Invalid model composition')}
}
export function compositionAppearance(design:z.infer<typeof DesignSchema>){
 const parsed=DesignSchema.parse(design);
 return {layout:parsed.layout,accent:{sand:'#e3c89e',mint:'#9ee3bf',sky:'#9ed8f5'}[parsed.palette]};
}
