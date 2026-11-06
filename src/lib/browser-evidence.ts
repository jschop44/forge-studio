/** Versioned browser-inspection evidence contract.
 * Capture adapters can be hosted separately from the free web frontend.
 */
export const BROWSER_EVIDENCE_VERSION=1 as const;
export type BrowserEvidence={
 version:typeof BROWSER_EVIDENCE_VERSION;
 sourceUrl:string;
 capturedAt:string;
 viewport:{width:number;height:number};
 pages:Array<{
  path:string;
  title:string;
  screenshotUrl?:string;
  landmarks:Array<{role:string;text:string}>;
  interactions:Array<{kind:'link'|'button'|'form'|'menu'|'search';label:string;target?:string;verified:boolean}>;
 }>;
 warnings:string[];
};
export function validateBrowserEvidence(input:unknown):input is BrowserEvidence{
 if(!input||typeof input!=='object')return false;
 const value=input as Partial<BrowserEvidence>;
 if(value.version!==1||typeof value.sourceUrl!=='string'||typeof value.capturedAt!=='string'||!Array.isArray(value.pages)||!Array.isArray(value.warnings)||!value.viewport)return false;
 try{const url=new URL(value.sourceUrl);if(url.protocol!=='https:')return false}catch{return false}
 if(!Number.isInteger(value.viewport.width)||!Number.isInteger(value.viewport.height)||value.viewport.width<240||value.viewport.height<240||value.viewport.width>3840||value.viewport.height>3840||value.pages.length>12)return false;
 return value.pages.every(page=>typeof page.path==='string'&&page.path.startsWith('/')&&typeof page.title==='string'&&Array.isArray(page.landmarks)&&Array.isArray(page.interactions)&&page.interactions.length<=100&&page.interactions.every(item=>['link','button','form','menu','search'].includes(item.kind)&&typeof item.label==='string'&&typeof item.verified==='boolean'));
}
