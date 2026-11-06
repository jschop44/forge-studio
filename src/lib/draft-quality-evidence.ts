import type { GeneratedPage } from "./business-site";
import { auditGeneratedDraft } from "./draft-quality-gate";

export type QualityEvidence = {
  status: "passed" | "failed";
  checkedAt: string;
  pageCount: number;
  errors: string[];
  warnings: string[];
  browserInteractionsVerified: false;
  liveDeploymentVerified: false;
  publishingApproved: false;
};

/** Durable, serializable QA record for a generated site draft.
 * Does not imply that the pages have been browser-tested or deployed.
 */
export function recordDraftQuality(pages: GeneratedPage[], now = new Date()): QualityEvidence {
  const result = auditGeneratedDraft(pages);
  return {
    status: result.readyForReview ? "passed" : "failed",
    checkedAt: now.toISOString(),
    pageCount: result.pageCount,
    errors: result.errors,
    warnings: result.warnings,
    browserInteractionsVerified: false,
    liveDeploymentVerified: false,
    publishingApproved: false,
  };
}

export function canSubmitForOwnerReview(evidence: QualityEvidence): boolean {
  return evidence.status === "passed" && evidence.errors.length === 0;
}
