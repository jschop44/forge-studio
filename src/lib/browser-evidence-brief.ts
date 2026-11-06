import { z } from "zod";

/**
 * Strict, untrusted browser-capture boundary. No model calls or publishing.
 * Keep the normalized evidence separate from any system/developer prompts.
 */
const httpsUrl = z.string().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test")) return false;
    // IP literals are not accepted: DNS resolution and redirect checks belong to the capture worker.
    if (host.startsWith("[") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || /^\d+$/.test(host)) return false;
    if (/^(?:127|10|0|192\.168)\./.test(host)) return false;
    if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host === "[::1]" || host === "[::]" || host === "169.254.169.254") return false;
    return true;
  } catch { return false; }
}, "Only public HTTPS URLs are accepted");

const shortText = z.string().trim().max(240);
const observedLink = z.object({
  label: shortText,
  href: httpsUrl,
  verified: z.literal(false).default(false),
}).strict();

export const browserEvidenceSchema = z.object({
  captureId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  capturedAt: z.string().datetime({ offset: true }),
  sourceUrl: httpsUrl,
  provenance: z.enum(["user-provided", "authorized-capture"]),
  screenshot: z.object({
    artifactRef: z.string().min(1).max(512),
    accessibleToGenerator: z.boolean(),
    width: z.number().int().min(240).max(7680),
    height: z.number().int().min(240).max(12000),
  }).strict(),
  title: shortText.optional(),
  headings: z.array(shortText).max(30).default([]),
  navigation: z.array(observedLink).max(30).default([]),
  captureErrors: z.array(shortText).max(20).default([]),
}).strict();

export type BrowserEvidence = z.infer<typeof browserEvidenceSchema>;

export type DesignBrief = {
  captureId: string;
  sourceUrl: string;
  screenshotStatus: "available" | "unavailable";
  observations: Array<{
    kind: "title" | "heading" | "navigation";
    value: string;
    confidence: "observed";
    source: string;
  }>;
  warnings: string[];
};

/** Never assert visual analysis when screenshot bytes are not accessible. */
export function createGroundedDesignBrief(input: unknown): DesignBrief {
  const evidence = browserEvidenceSchema.parse(input);
  const source = `browser-capture:${evidence.captureId}`;
  const observations: DesignBrief["observations"] = [];
  if (evidence.title) observations.push({ kind: "title", value: evidence.title, confidence: "observed", source });
  for (const heading of evidence.headings) observations.push({ kind: "heading", value: heading, confidence: "observed", source });
  for (const link of evidence.navigation) observations.push({ kind: "navigation", value: link.label, confidence: "observed", source });
  return {
    captureId: evidence.captureId,
    sourceUrl: evidence.sourceUrl,
    screenshotStatus: evidence.screenshot.accessibleToGenerator ? "available" : "unavailable",
    observations,
    warnings: [
      ...(!evidence.screenshot.accessibleToGenerator ? ["Screenshot not accessible to generator; visual layout cannot be inferred."] : []),
      ...evidence.captureErrors,
      ...(evidence.navigation.length ? ["Captured link destinations are unverified."] : []),
    ],
  };
}
