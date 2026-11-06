import type { GeneratedPage } from "./business-site";
import { auditGeneratedDraft } from "./draft-quality-gate";

/** Publishing preflight: fail closed unless the owner explicitly approves
 * a structurally valid draft. This does not deploy or persist the website.
 */
export function preflightReviewedPublication(pages: GeneratedPage[], ownerApproved: boolean) {
  const quality = auditGeneratedDraft(pages);
  const errors = [...quality.errors];
  if (!ownerApproved) errors.push("Owner approval required before publishing");
  if (pages.length === 0) errors.push("Cannot publish an empty website");
  return {
    allowed: errors.length === 0,
    errors,
    warnings: [
      ...quality.warnings,
      "Browser interaction and live deployment checks must be completed separately.",
    ],
    pageCount: pages.length,
    deployed: false as const,
  };
}
