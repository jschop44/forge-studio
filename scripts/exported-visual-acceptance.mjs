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
   labels.some(label=>Boolean(label)&&!/\bdisney\b/i.test(label)&&
    !/^(?:source website (?:logo|icon)|official site (?:logo|icon))$/i.test(label))||
   paths.some(path=>/(?:fortnite|hulu|disneybundle|celebrate[-_]?the[-_]?magic)/i.test(path))
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

/** Distinguish a real source-photo hero from a text-only heading followed by
 * a detached image gallery. A wide, captioned source photo sitting in that
 * gallery is direct evidence of a missed editorial hero opportunity.
 * Browser capture still needs manual aesthetic review after this check.
 */
export function inspectEditorialHero(html){
 const body=String(html||'');
 const hero=body.match(/<section\b[^>]*class\s*=\s*["'][^"']*\bsite-hero\b[^"']*["'][^>]*>[\s\S]{0,30000}?<\/section>/i)?.[0]||'';
 const gallery=body.match(/<section\b[^>]*class\s*=\s*["'][^"']*\bsource-highlights\b[^"']*["'][^>]*>[\s\S]{0,30000}?<\/section>/i)?.[0]||'';
 const sourceHero=/<figure\b[^>]*data-forge-source-figure[^>]*>[\s\S]*?<img\b[^>]*data-forge-source-image/i.test(hero);
 const wideGalleryPhoto=[...gallery.matchAll(/<img\b[^>]*>/gi)].some(([tag])=>{
  const width=Number(tag.match(/\bwidth\s*=\s*["'](\d+)/i)?.[1]||0),height=Number(tag.match(/\bheight\s*=\s*["'](\d+)/i)?.[1]||0);
  const alt=tag.match(/\balt\s*=\s*["']([^"']*)/i)?.[1]||'';
  return width>=1100&&height>=450&&width/height>=1.6&&width/height<=4.5&&alt.trim().length>=22;
 });
 const warning=wideGalleryPhoto&&!sourceHero?'A descriptive wide source image is available in the gallery but the homepage lacks an integrated first-party hero.':null;
 return {heroPresent:!!hero,heroTextLed:/\btext-led\b/.test(hero),sourceHero,wideGalleryPhoto,warning};
}


/** Deterministic browser geometry failures; not a substitute for a human
 * assessment of brand accuracy, image subject relevance or aesthetics.
 * Only visible headings and fully loaded images should be passed in.
 */
export function inspectExportedLayout(snapshot){
 const defects=[];
 const page=String(snapshot?.page||'exported page').slice(0,100);
 const device=String(snapshot?.device||'viewport').slice(0,30);
 const contentWidth=Number(snapshot?.documentWidth);
 const viewportWidth=Number(snapshot?.viewportWidth);
 if(Number.isFinite(contentWidth)&&Number.isFinite(viewportWidth)&&viewportWidth>=300&&contentWidth>viewportWidth+2)
  defects.push(page+' at '+device+': horizontal overflow '+Math.round(contentWidth-viewportWidth)+'px');
 const clipped=Array.isArray(snapshot?.headingsClipped)?snapshot.headingsClipped.filter(Boolean):[];
 if(clipped.length)
  defects.push(page+' at '+device+': clipped visible headings: '+clipped.slice(0,3).join(' / ').slice(0,220));
 const broken=Number(snapshot?.images?.confirmedBroken||0);
 if(broken>0)
  defects.push(page+' at '+device+': '+broken+' browser-confirmed broken images');
 // CSS layouts can be pixel-perfect but show an empty colored shell. Inspect
 // main.innerText in the rendered browser, not raw source or hidden templates.
 // A real photo can count as visual content, while logos never substitute for it.
 if(snapshot?.hasMain===false)
  defects.push(page+' at '+device+': no visible main content landmark');
 else if(snapshot?.hasMain===true){
  const textLength=Number(snapshot?.mainVisibleTextLength);
  const photos=Number(snapshot?.mainVisiblePhotos||0);
  if(Number.isFinite(textLength)&&Number.isFinite(photos)&&textLength<25&&photos===0)
   defects.push(page+' at '+device+': essentially blank main content ('+Math.max(0,Math.round(textLength))+' visible text characters and no loaded content photos)');
 }
 return {passes:!defects.length,defects};
}
