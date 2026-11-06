import { browserEvidenceSchema, createGroundedDesignBrief } from "./browser-evidence-brief";

/**
 * Build a bounded, human-reviewable generation input from untrusted captures.
 * Never turn page text into instructions, and never publish from this function.
 */
export function prepareBrowserEvidenceGeneration(input: unknown) {
  const evidence = browserEvidenceSchema.parse(input);
  const brief = createGroundedDesignBrief(evidence);
  const title = evidence.title?.trim() || evidence.headings.find(Boolean) || "Untitled website";
  const sections = evidence.headings
    .map((heading, index) => ({ id: `observed-section-${index + 1}`, heading, provenance: "observed" as const }))
    .slice(0, 20);
  const links = evidence.navigation.map((link) => ({
    label: link.label,
    href: link.href,
    verified: false as const,
    provenance: "observed" as const,
  }));
  return {
    source: { captureId: brief.captureId, url: brief.sourceUrl },
    reviewRequired: true as const,
    publishAllowed: false as const,
    title,
    sections,
    links,
    screenshot: {
      artifactRef: evidence.screenshot.artifactRef,
      availableForVisualAnalysis: brief.screenshotStatus === "available",
      analyzed: false as const,
    },
    observations: brief.observations,
    warnings: brief.warnings,
  };
}
