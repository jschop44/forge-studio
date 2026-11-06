import { browserEvidenceSchema } from "./browser-evidence-brief";
import { validateBrowserEvidence } from "./browser-evidence";
import type { BrowserEvidence as WorkerEvidence } from "./browser-evidence";

/**
 * Adapts the existing Playwright worker's version-1 output to the review-only
 * evidence contract. A local screenshot filename is NOT an accessible image.
 */
export function workerCaptureToReviewEvidence(input: unknown) {
  if (!validateBrowserEvidence(input)) throw new Error("Invalid browser worker evidence");
  const capture = input as WorkerEvidence;
  const origin = new URL(capture.sourceUrl);
  const first = capture.pages[0];
  if (!first) throw new Error("Browser worker returned no pages");
  const headings = first.landmarks
    .filter(item => item.role === "h1" || item.role === "h2")
    .map(item => item.text.trim())
    .filter(Boolean)
    .slice(0, 30);
  const navigation = first.interactions
    .filter(item => item.kind === "link" && item.target && item.label.trim())
    .flatMap(item => {
      try {
        const url = new URL(item.target!, origin);
        if (url.origin !== origin.origin || url.protocol !== "https:") return [];
        return [{ label: item.label.slice(0, 240), href: url.href, verified: false as const }];
      } catch { return []; }
    }).slice(0, 30);
  return browserEvidenceSchema.parse({
    captureId: "worker-v1",
    capturedAt: new Date(capture.capturedAt).toISOString(),
    sourceUrl: origin.href,
    provenance: "authorized-capture",
    screenshot: {
      artifactRef: first.screenshotUrl || "not-captured",
      accessibleToGenerator: false,
      width: capture.viewport.width,
      height: capture.viewport.height,
    },
    title: first.title.slice(0, 240),
    headings,
    navigation,
    captureErrors: [
      "Worker screenshot has not been transferred to the generator; visual analysis unavailable.",
      ...capture.warnings.slice(0, 19).map(warning => warning.slice(0, 240)),
    ].slice(0, 20),
  });
}
