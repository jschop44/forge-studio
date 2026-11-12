/** Source identity must match before logos, page copy or navigation can be reused. */
export function matchingSourceBusiness(entered:string,observed:string):boolean{
 const words=(text:string)=>text.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(word=>word.length>1&&!['the','www','com','home','official','website','inc','llc','ltd'].includes(word));
 const a=words(entered),b=words(observed);
 return a.length>0&&b.length>0&&a.some(word=>b.includes(word));
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
