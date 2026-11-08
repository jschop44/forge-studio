import { z } from "zod";

/** Explicitly bounded, removable learning-memory entries.
 * This pure module never collects user data or sends anything externally.
 */
export const LearningObservationSchema = z.object({
  source: z.enum(["site-audit", "draft-qa", "owner-feedback"]),
  projectId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  category: z.enum(["navigation", "content", "visual", "seo", "accessibility", "conversion"]),
  finding: z.string().trim().min(3).max(500),
  outcome: z.enum(["helpful", "unhelpful", "unverified"]),
  evidenceRef: z.string().max(500).optional(),
  recordedAt: z.string().datetime({ offset: true }),
}).strict();
export type LearningObservation = z.infer<typeof LearningObservationSchema>;

export function summarizeLearningObservations(input: unknown[]) {
  const observations = input.map(item => LearningObservationSchema.parse(item));
  const categories = [...new Set(observations.map(item => item.category))].sort();
  return {
    total: observations.length,
    categories: categories.map(category => ({
      category,
      helpful: observations.filter(item => item.category === category && item.outcome === "helpful").length,
      unhelpful: observations.filter(item => item.category === category && item.outcome === "unhelpful").length,
      unverified: observations.filter(item => item.category === category && item.outcome === "unverified").length,
    })),
    recommendationsAllowed: false as const,
    note: "Aggregates recorded outcomes only; no autonomous learning or model training occurs.",
  };
}

/** Summarize the bounded records actually returned, tolerating legacy/corrupt entries.
 * Findings are data only; this never authorizes recommendations or trains a model.
 */
export function summarizeStoredLearningObservations(input: unknown[]) {
  const valid: LearningObservation[] = [];
  for (const item of input) {
    const parsed = LearningObservationSchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
  }
  return {...summarizeLearningObservations(valid), ignoredInvalid: input.length-valid.length,
    scope: "returned-records" as const};
}
