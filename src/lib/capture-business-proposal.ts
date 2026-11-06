import { generateBusinessWebsite } from "./business-site";
import { prepareBrowserEvidenceGeneration } from "./browser-evidence-generation";

/**
 * Converts a browser capture into a review-only business-site proposal.
 * A person must supply missing industry, description and services before
 * calling generateBusinessWebsite; this module does not invent business facts.
 */
export function proposeBusinessSiteFromCapture(input: unknown) {
  const draft = prepareBrowserEvidenceGeneration(input);
  const summary = draft.sections.map((section) => section.heading).filter(Boolean).slice(0, 8);
  return {
    source: draft.source,
    businessName: draft.title.slice(0, 100),
    industry: null as string | null,
    description: null as string | null,
    services: [] as string[],
    observedHeadings: summary,
    navigation: draft.links,
    missingRequiredFields: ["industry", "description", "services"] as const,
    reviewRequired: true as const,
    publishAllowed: false as const,
    warnings: draft.warnings,
  };
}

/**
 * Complete a reviewed proposal with user-supplied business facts and hand it
 * to the existing four-page site generator. No automatic publishing occurs.
 */
export function generateReviewedCaptureSite(
  capture: unknown,
  approved: { industry: string; description: string; services: string[]; contactEmail?: string },
  ownerApproved: boolean,
) {
  if (!ownerApproved) throw new Error("Explicit owner approval is required");
  const proposal = proposeBusinessSiteFromCapture(capture);
  const { generateBusinessWebsite } = requireBusinessGenerator();
  return generateBusinessWebsite({
    businessName: proposal.businessName,
    industry: approved.industry,
    description: approved.description,
    services: approved.services,
    contactEmail: approved.contactEmail,
  });
}

function requireBusinessGenerator() {
  return { generateBusinessWebsite };
}
