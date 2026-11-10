import type {VisualAsset} from './visual-assets';
export const BUSINESS_GENERATION_MAX_BYTES=64*1024;
/** Keep extraction evidence local; the inference endpoint consumes the brief and visuals. */
export function businessGenerationPayload<T extends {description:string;visualAssets:VisualAsset[];visualSignals?:unknown}>(input:T){
 const {visualSignals:_evidence,...brief}=input;
 const payload={...brief,description:input.description.slice(0,1800),visualAssets:[...input.visualAssets]};
 while(new TextEncoder().encode(JSON.stringify(payload)).byteLength>60*1024&&payload.visualAssets.length)payload.visualAssets.pop();
 return payload;
}
