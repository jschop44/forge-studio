import { z } from "zod";
import { browserEvidenceSchema } from "./browser-evidence-brief";

/** Converts metadata-only site inspection into the strict capture contract.
 * This does not claim screenshots or browser-rendered visuals were captured.
 */
const Inspection = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(240).optional(),
  headings: z.array(z.string().max(240)).max(100).optional(),
  navigation: z.array(z.object({
    label: z.string().max(240),
    path: z.string().max(2048),
  })).max(100).optional(),
}).passthrough();

export function inspectionToBrowserEvidence(input: unknown) {
  const inspection = Inspection.parse(input);
  const base = new URL(inspection.url);
  const navigation = (inspection.navigation || []).flatMap((link) => {
    try {
      const url = new URL(link.path, base);
      if (url.origin !== base.origin || url.protocol !== "https:") return [];
      return [{ label: link.label, href: url.href, verified: false as const }];
    } catch { return []; }
  }).slice(0, 30);
  const normalized = {
    captureId: "metadata-inspection",
    capturedAt: new Date().toISOString(),
    sourceUrl: base.href,
    provenance: "user-provided" as const,
    screenshot: {
      artifactRef: "not-captured",
      accessibleToGenerator: false,
      width: 1280,
      height: 720,
    },
    title: inspection.title,
    headings: (inspection.headings || []).slice(0, 30),
    navigation,
    captureErrors: ["Metadata-only inspection: browser screenshot and visual layout were not captured."],
  };
  return browserEvidenceSchema.parse(normalized);
}
