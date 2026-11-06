import assert from "node:assert/strict";
import test from "node:test";
import { generateBusinessWebsite } from "../src/lib/business-site";
import { canSubmitForOwnerReview, recordDraftQuality } from "../src/lib/draft-quality-evidence";

test("produces honest QA evidence for a generated website", () => {
  const site = generateBusinessWebsite({
    businessName: "Example Services",
    industry: "Consulting",
    description: "Consulting and support for businesses in the local area.",
    services: ["Consulting", "Support"],
  });
  const evidence = recordDraftQuality(site.pages, new Date("2026-11-06T04:00:00Z"));
  assert.equal(evidence.status, "passed");
  assert.equal(evidence.checkedAt, "2026-11-06T04:00:00.000Z");
  assert.equal(evidence.browserInteractionsVerified, false);
  assert.equal(evidence.liveDeploymentVerified, false);
  assert.equal(evidence.publishingApproved, false);
  assert.equal(canSubmitForOwnerReview(evidence), true);
});

test("broken draft cannot be submitted for review", () => {
  const evidence = recordDraftQuality([{slug:"index",title:"Home",html:"invalid"}]);
  assert.equal(evidence.status, "failed");
  assert.equal(canSubmitForOwnerReview(evidence), false);
});
