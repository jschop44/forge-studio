/** Source identity must match before logos, page copy or navigation can be reused. */
export function matchingSourceBusiness(entered:string,observed:string):boolean{
 const words=(text:string)=>text.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(word=>word.length>1&&!['the','www','com','home','official','website','inc','llc','ltd'].includes(word));
 const a=words(entered),b=words(observed);
 if(!a.length||!b.length)return false;
 // Full names sometimes omit spaces in metadata (BestBuy versus Best Buy).
 if(a.join('')===b.join(''))return true;
 const common=[...new Set(a.filter(word=>b.includes(word)))];
 if(common.length>=2)return true;
 // Single-token brands can appear inside a longer official site name.
 if(a.length===1&&common.length===1)return true;
 // Do not treat a short generic word like "Best" or "Pizza" as
 // proof that two differently named businesses are identical.
 // A distinctive one-word brand may stand alone on either side.
 return common.length===1&&common[0].length>=8&&(a.length===1||b.length===1);
}
/** Redirect/interstitial pages and opaque tracking IDs are not business destinations. */
export function usefulSourcePage(page:{path:string;label:string;title?:string;headings?:string[]}):boolean{
 const text=[page.label,page.title,...(page.headings||[])].filter(Boolean).join(' ');
 if(/\b(?:you are (?:now )?leaving|redirecting|external (?:site|link)|exit (?:page|site)|access denied|verify (?:you are|your browser))\b/i.test(text))return false;
 if(/(?:^|\/)(?:exit|redirect|leaving|outbound)(?:[/?#]|$)/i.test(page.path))return false;
 if(/^[a-z0-9_-]{28,}$/i.test(page.label.trim())&&/[a-z]/i.test(page.label)&&/\d/.test(page.label))return false;
 return true;
}

/** A named, unrelated business is a NEW site, never a relabeled source design.
 * Explicit preservation/redesign of the same business remains unchanged.
 * This decision also protects imported logos, email addresses and product data.
 */
export function resolveGenerationSourceMode(mode:'new'|'inspired'|'redesign',entered:string,observed:string|null|undefined):{
 mode:'new'|'inspired'|'redesign';discardUnrelatedSource:boolean
}{
 const discardUnrelatedSource=mode!=='new'&&Boolean(observed?.trim()&&entered.trim())&&!matchingSourceBusiness(entered,observed||'');
 return {mode:discardUnrelatedSource?'new':mode,discardUnrelatedSource};
}

/** Retain catalog labels supported by BOTH source navigation and a described
 * source image. Recognition may identify a sector, but must not collapse a real
 * catalog into a generic offering such as "Technology".
 */
export function observedCatalogOfferings(navigation:readonly {label:string;path:string}[],images:readonly {alt:string;role:string}[]):string[]{
 const key=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const labels=new Set(images.filter(image=>image.role==='content').map(image=>key(image.alt)));
 return navigation.filter(link=>usefulSourcePage(link)&&link.label.length<=80&&labels.has(key(link.label))&&!/\b(?:deals?|members?|shop|sale|offers?)\b/i.test(link.label))
  .map(link=>link.label).filter((label,index,all)=>all.findIndex(other=>key(other)===key(label))===index).slice(0,8);
}
