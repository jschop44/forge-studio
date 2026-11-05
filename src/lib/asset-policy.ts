export const ASSET_MAX_BYTES=12*1024*1024;
export const SUPPORTED_IMAGE_TYPES=['image/png','image/jpeg','image/webp','image/avif'] as const;
export const SUPPORTED_MODEL_TYPES=['model/gltf-binary','model/gltf+json'] as const;
export function validateAsset(file:{name:string;type:string;size:number}){
 if(file.size<=0||file.size>ASSET_MAX_BYTES)return {ok:false,reason:'Asset must be between 1 byte and 12 MB'};
 const types:string[]=[...SUPPORTED_IMAGE_TYPES,...SUPPORTED_MODEL_TYPES];
 if(!types.includes(file.type)&&!(file.name.toLowerCase().endsWith('.glb')&&(file.type===''||file.type==='application/octet-stream')))return {ok:false,reason:'Unsupported asset type'};
 if(!/^[a-zA-Z0-9_. -]{1,160}$/.test(file.name))return {ok:false,reason:'Invalid asset filename'};
 return {ok:true,reason:'Accepted for client-side preview'};
}
