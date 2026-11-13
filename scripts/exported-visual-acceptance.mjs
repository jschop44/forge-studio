/** Pure checks for browser-captured, exported website HTML.
 * A source-mark reference is not proof of logo ownership, but obvious
 * campaign/partner imagery should never become a company's header logo.
 * Separate visual signals from the tested navigation and export contract.
 */
export function inspectExportedBranding(html,business){
 const nav=String(html||'').match(/<nav\b[^>]*>[\s\S]{0,30000}?<\/nav>/i)?.[0]||'';
 const logos=[...nav.matchAll(/<img\b[^>]*class\s*=\s*["'][^"']*\bsource-brand-logo\b[^"']*["'][^>]*>/gi)].map(match=>match[0]);
 const attr=(tag,name)=>tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')','i'))?.slice(1).find(Boolean)||'';
 const labels=logos.map(tag=>attr(tag,'alt'));
 const paths=logos.map(tag=>{
  try{return new URL(attr(tag,'src')).pathname.split('/').pop()||''}catch{return ''}
 });
 // Real Disney acceptance already exposed Hulu and Fortnite promotions
 // wrongly substituted for its primary corporate brand. A readable
 // wordmark with no observed official logo is acceptable.
 const promotional=business==='Disney'
  ?labels.some(label=>/\b(?:fortnite|hulu|bundle|espn|pixar|marvel)\b/i.test(label))||
   paths.some(path=>/(?:fortnite|hulu|disneybundle)/i.test(path))
  :false;
 const joinedBrand=labels.some(label=>/\s\|\s/.test(label)&&!/\|\s*(?:official\s+)?(?:logo|icon|wordmark)\s*$/i.test(label));
 return {
  branding:logos.length?'source-logo':'wordmark-or-original-brand',
  sourceLogoCount:logos.length,
  logoAlt:labels.slice(0,4),
  assetNames:paths.slice(0,4),
  promotionalLogoFound:promotional||joinedBrand,
  warning:promotional||joinedBrand?'Promotional partner graphics were used as a primary company logo.':null,
 };
}

export function inspectExportedPhotoCoverage(html){
 const body=String(html||'');
 const cards=[...body.matchAll(/<article\b[^>]*class\s*=\s*["'][^"']*\bservice-card\b[^"']*["'][^>]*>[\s\S]{0,20000}?<\/article>/gi)].map(item=>item[0]);
 const withPhoto=cards.filter(card=>/<img\b[^>]*class\s*=\s*["'][^"']*\bservice-photo\b/i.test(card)).length;
 const images=[...body.matchAll(/<img\b[^>]*>/gi)].map(match=>match[0]);
 const content=images.filter(tag=>!/\b(?:source-brand-logo|brand-mark|favicon|tracking|pixel)\b/i.test(tag)).length;
 return {offeringCards:cards.length,offeringCardsWithPhoto:withPhoto,contentImages:content,
  warning:cards.length>=3&&withPhoto<2?'Most offering cards have no verified matching image.':null};
}
