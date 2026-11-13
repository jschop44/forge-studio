/** A deliberately fixed, browser-independent patch for genuinely clipped phone headings.
 * The isolated browser worker may request it, but it cannot supply arbitrary CSS.
 * Keep the exact string identical between the worker and the server-side verifier.
 */
export const MOBILE_HEADING_REPAIR_TAG='<style id="forge-mobile-heading-repair">@media(max-width:700px){body main h1,body main h2,body main h3{white-space:normal!important;text-overflow:clip!important;overflow:visible!important;overflow-wrap:anywhere!important;word-break:normal!important;max-height:none!important;height:auto!important;max-width:100%!important}}</style>';

export function applyMobileHeadingRepair(html:string):string{
 if(html.includes('id="forge-mobile-heading-repair"')||!/<\/head>/i.test(html))return html;
 return html.replace(/<\/head>/i,MOBILE_HEADING_REPAIR_TAG+'</head>');
}
