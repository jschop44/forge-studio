import type {WebsiteDesignDna} from './website-design-dna';
import {validateBrowserEvidence} from './browser-evidence';

/** Only an explicitly requested Preserve Style draft may reuse observed browser tokens.
 * Do not promote screenshots, scripts or arbitrary source CSS into generated markup.
 */
function opaqueHex(value:string):string|undefined{
 const input=value.trim();
 if(/^#[0-9a-f]{6}$/i.test(input))return input.toLowerCase();
 const match=input.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(1(?:\.0+)?))?\s*\)$/i);
 if(!match)return;
 const channels=match.slice(1,4).map(Number);
 if(channels.some(channel=>channel>255))return;
 return '#'+channels.map(channel=>channel.toString(16).padStart(2,'0')).join('');
}
export function mergeObservedStyleEvidence(
 dna:WebsiteDesignDna,
 evidence:unknown,
 mode:'new'|'redesign'|'inspired'
):WebsiteDesignDna{
 if(mode!=='inspired'||!validateBrowserEvidence(evidence))return dna;
 const original=new URL(dna.sourceUrl),observed=new URL(evidence.sourceUrl);
 if(original.origin!==observed.origin)return dna;
 const page=evidence.pages.find(candidate=>{
  try{
   const url=new URL(candidate.path,observed);
   return url.origin===original.origin&&url.pathname===original.pathname;
  }catch{return false}
 });
 if(!page?.designTokens)return dna;
 const background=opaqueHex(page.designTokens.backgroundColor);
 const font=page.designTokens.fontFamily.replace(/["']/g,'').trim().slice(0,180);
 const safeFont=/^[a-z0-9 ,.-]+$/i.test(font)?font:undefined;
 if(!background&&!safeFont)return dna;
 return {
  ...dna,
  palette:background?[background,...dna.palette.filter(color=>color.toLowerCase()!==background)].slice(0,12):dna.palette,
  typography:{families:safeFont?[safeFont,...dna.typography.families.filter(family=>family!==safeFont)].slice(0,8):dna.typography.families},
  warnings:[...dna.warnings,'Authorized browser-captured colors and font names were approximated; exact computed layout, downloadable fonts and image availability are not verified.']
 };
}
