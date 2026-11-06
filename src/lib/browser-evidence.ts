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
  visualRegions?:Array<{role:string;x:number;y:number;width:number;height:number;text?:string}>;
  interactions:Array<{kind:'link'|'button'|'form'|'menu'|'search';label:string;target?:string;verified:boolean}>;
 }>;
 warnings:string[];
};
export function validateBrowserEvidence(input:unknown):input is BrowserEvidence{
 if(!input||typeof input!=='object')return false;
 const value=input as Partial<BrowserEvidence>;
 if(value.version!==1||typeof value.sourceUrl!=='string'||typeof value.capturedAt!=='string'||!Array.isArray(value.pages)||!Array.isArray(value.warnings)||!value.viewport)return false;
 try{const url=new URL(value.sourceUrl);if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')return false;const host=url.hostname.toLowerCase();if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.test')||host.startsWith('[')||/^(?:\\d{1,3}\\.){3}\\d{1,3}$/.test(host)||/^\\d+$/.test(host))return false}catch{return false}
 if(!Number.isFinite(Date.parse(value.capturedAt))||value.warnings.some(w=>typeof w!=='string'||w.length>500)||value.warnings.length>50)return false;
 if(!Number.isInteger(value.viewport.width)||!Number.isInteger(value.viewport.height)||value.viewport.width<240||value.viewport.height<240||value.viewport.width>3840||value.viewport.height>3840||value.pages.length>12)return false;
 return value.pages.every(page=>typeof page.path==='string'&&page.path.startsWith('/')&&typeof page.title==='string'&&page.title.length<=500&&(page.screenshotUrl===undefined||typeof page.screenshotUrl==='string'&&page.screenshotUrl.length<=2048)&&Array.isArray(page.landmarks)&&page.landmarks.length<=100&&page.landmarks.every(item=>typeof item.role==='string'&&typeof item.text==='string'&&item.text.length<=500)&&(page.visualRegions===undefined||Array.isArray(page.visualRegions)&&page.visualRegions.length<=100&&page.visualRegions.every(r=>r&&['header','nav','main','footer','hero','section'].includes(r.role)&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=value.viewport!.width+1&&r.y+r.height<=value.viewport!.height+1&&(r.text===undefined||typeof r.text==='string'&&r.text.length<=200)))&&Array.isArray(page.interactions)&&page.interactions.length<=100&&page.interactions.every(item=>['link','button','form','menu','search'].includes(item.kind)&&typeof item.label==='string'&&item.label.length<=200&&(item.target===undefined||typeof item.target==='string'&&item.target.length<=500)&&typeof item.verified==='boolean'));
}
