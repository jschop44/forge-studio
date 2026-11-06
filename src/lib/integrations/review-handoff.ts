import { z } from "zod";
import { BusinessContextSchema } from "./contracts";

/** Strict, review-only cross-app handoff. No external apps are called or changed. */
const ReviewHandoffSchema = BusinessContextSchema.strict().extend({
  ownerApproved: z.literal(true),
  destination: z.literal("forge-studio"),
  requestedAction: z.literal("create-draft"),
}).strict();

export function prepareCrossAppReview(input: unknown) {
  const context = ReviewHandoffSchema.parse(input);
  return {
    source: context.source,
    businessName: context.businessName,
    industry: context.industry || null,
    summary: context.summary || null,
    issueCount: context.issues.length,
    issues: context.issues.map(item => ({...item})),
    readyForGeneration: Boolean(context.industry && context.summary && context.summary.length >= 15),
    externalMutationPerformed: false as const,
    publishingAllowed: false as const,
    warnings: ["Owner-approved handoff is for draft preparation only; verify all imported facts before publishing."],
  };
}
