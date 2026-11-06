import type {BrowserEvidence} from './browser-evidence';

/** Read-only GET probes are navigation evidence, not proof of button/form behavior. */
export function summarizeNavigationHealth(input:BrowserEvidence){
 const checks=input.pages.flatMap(page=>page.navigationChecks||[]);
 const passed=checks.filter(check=>check.ok&&check.status!==null&&check.status>=200&&check.status<400);
 const broken=checks.filter(check=>check.status!==null&&check.status>=400);
 const inconclusive=checks.filter(check=>check.status===null||(!check.ok&&check.status!==null&&check.status<400));
 const uniqueBroken=[...new Set(broken.map(check=>check.path))].slice(0,20);
 return {
  inspected:checks.length,passed:passed.length,broken:broken.length,inconclusive:inconclusive.length,
  brokenPaths:uniqueBroken,
  status:checks.length===0?'not-tested' as const:broken.length?'issues-found' as const:inconclusive.length?'inconclusive' as const:'passed' as const,
  limitations:['Navigation GET status only; link destinations may render errors or require authentication, and form/button behavior is not tested'],
 };
}
