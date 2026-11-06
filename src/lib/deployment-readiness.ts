import type { GeneratedPage } from "./business-site";
import { recordDraftQuality } from "./draft-quality-evidence";
import { preflightReviewedPublication } from "./reviewed-publication-preflight";

export type DeploymentReadiness = {
  ready: boolean;
  blockers: string[];
  staticQaPassed: boolean;
  browserVerified: boolean;
  productionHealthVerified: boolean;
  publicPagesVerified: boolean;
  rollbackVerified: boolean;
};

/** Fail-closed production readiness assessment.
 * External verification flags must be supplied from real checks, not inferred
 * from a successful local build or generated HTML.
 */
export function assessDeploymentReadiness(input: {
  pages: GeneratedPage[];
  ownerApproved: boolean;
  browserVerified: boolean;
  productionHealthVerified: boolean;
  publicPagesVerified: boolean;
  rollbackVerified: boolean;
}): DeploymentReadiness {
  const quality = recordDraftQuality(input.pages);
  const preflight = preflightReviewedPublication(input.pages, input.ownerApproved);
  const blockers = [...preflight.errors];
  if (!input.browserVerified) blockers.push("Browser interactions not verified");
  if (!input.productionHealthVerified) blockers.push("Production health not verified");
  if (!input.publicPagesVerified) blockers.push("Public pages not verified");
  if (!input.rollbackVerified) blockers.push("Rollback not verified");
  return {
    ready: blockers.length === 0,
    blockers,
    staticQaPassed: quality.status === "passed",
    browserVerified: input.browserVerified,
    productionHealthVerified: input.productionHealthVerified,
    publicPagesVerified: input.publicPagesVerified,
    rollbackVerified: input.rollbackVerified,
  };
}
