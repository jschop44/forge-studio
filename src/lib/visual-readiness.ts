import type {BrowserEvidence} from './browser-evidence';
export type VisualReadiness={ready:boolean;capturedPages:number;screenshots:number;verifiedInteractions:number;warnings:string[]};
/** Reports whether browser evidence is useful for visual reconstruction.
 * A local artifact path is not a public screenshot URL.
 */
export function visualReadiness(evidence:BrowserEvidence):VisualReadiness{
 const screenshots=evidence.pages.filter(page=>typeof page.screenshotUrl==='string'&&/^https:\/\//.test(page.screenshotUrl)).length;
 const verifiedInteractions=evidence.pages.reduce((sum,page)=>sum+page.interactions.filter(item=>item.verified).length,0);
 const warnings=[...evidence.warnings];
 if(screenshots===0)warnings.push('No remotely accessible screenshots available to the generator');
 if(verifiedInteractions===0)warnings.push('No interactions verified in a browser');
 return {ready:screenshots>0,capturedPages:evidence.pages.length,screenshots,verifiedInteractions,warnings};
}
