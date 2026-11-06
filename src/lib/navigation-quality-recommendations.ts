import type {BrowserEvidence} from './browser-evidence';
import {summarizeNavigationHealth} from './navigation-health';

/** Recommendations refer to inspected source-site navigation, not generated pages. */
export function navigationQualityRecommendations(evidence:BrowserEvidence){
 const health=summarizeNavigationHealth(evidence);
 const recommendations=health.brokenPaths.map(path=>({
  priority:'high' as const,
  finding:'Observed navigation request failed: '+path,
  action:'Verify the destination exists, correct the internal link target, and re-run browser navigation checks.',
  evidenceType:'browser-navigation-get' as const,
 }));
 if(health.inconclusive)recommendations.push({
  priority:'high' as const,
  finding:health.inconclusive+' navigation checks were inconclusive',
  action:'Inspect timeouts, redirects, or access restrictions manually before asserting these links work.',
  evidenceType:'browser-navigation-get' as const,
 });
 return {status:health.status,inspected:health.inspected,recommendations,sourceOnly:true as const};
}
