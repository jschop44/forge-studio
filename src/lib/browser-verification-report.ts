import { z } from "zod";

/** Bounded results from an external browser test runner.
 * Never treat unverified user-provided results as independent CI evidence.
 */
export const BrowserVerificationSchema = z.object({
  source: z.literal("playwright-ci"),
  runId: z.string().regex(/^[0-9]{1,30}$/),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  baseUrl: z.string().url().refine(url => url.startsWith("https://"), "HTTPS required"),
  checkedAt: z.string().datetime({offset:true}),
  checks: z.array(z.object({
    name: z.enum(["navigation","mobile-viewport","forms","reduced-motion","accessibility"]),
    passed: z.boolean(),
    detail: z.string().max(500).optional(),
  }).strict()).min(1).max(20),
}).strict();

export function summarizeBrowserVerification(input: unknown) {
  const report = BrowserVerificationSchema.parse(input);
  const required = ["navigation","mobile-viewport","forms","reduced-motion","accessibility"];
  const missing = required.filter(name => !report.checks.some(check => check.name === name && check.passed));
  return {
    passed: missing.length === 0,
    missing,
    runId: report.runId,
    commitSha: report.commitSha,
    checkedAt: report.checkedAt,
    independentEvidenceVerified: false as const,
    note: "Parsed report only. Confirm the referenced CI run and artifacts before relying on it.",
  };
}
