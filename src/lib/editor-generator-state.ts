import {z} from 'zod';
import {DESIGN_PATTERNS} from './design-engine';

/** Only editable business setup crosses the editor boundary. Approval and credentials do not. */
const State=z.object({
 version:z.literal(1),name:z.string().max(200),brief:z.string().max(12000),
 contactEmail:z.string().max(254),siteUrl:z.string().max(2000),referenceMarkup:z.string().max(250000),
 designMode:z.enum(['new','inspired','redesign']),experienceStyle:z.enum(['standard','cinematic','object-navigation','immersive']),
 visualDesignMode:z.enum(['auto','library']),visualPatternId:z.string().max(64).refine(id=>DESIGN_PATTERNS.some(pattern=>pattern.id===id)),
 autoImmersive:z.boolean(),reviewIndustry:z.string().max(200),reviewServices:z.string().max(2000)
}).strict();
export type GeneratorEditorState=z.infer<typeof State>;
const limit=600000;
export function serializeGeneratorEditorState(state:GeneratorEditorState):string{
 const raw=JSON.stringify(State.parse(state));
 if(raw.length>limit)throw Error('Business setup exceeds editor handoff limit');
 return raw;
}
export function parseGeneratorEditorState(raw:string|null):GeneratorEditorState|null{
 if(!raw||raw.length>limit)return null;
 try{const result=State.safeParse(JSON.parse(raw));return result.success?result.data:null}catch{return null}
}
