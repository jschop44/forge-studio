import assert from "node:assert/strict";
import test from "node:test";
import { generateBusinessWebsite } from "../src/lib/business-site";
import { preflightReviewedPublication } from "../src/lib/reviewed-publication-preflight";
import { recordDraftQuality } from "../src/lib/draft-quality-evidence";
import { workerCaptureToReviewEvidence } from "../src/lib/worker-capture-review-adapter";
import { generateReviewedCaptureSite } from "../src/lib/capture-business-proposal";

test("authorized browser metadata to reviewed four-page draft and quality preflight", () => {
  const evidence = workerCaptureToReviewEvidence({
    version: 1, sourceUrl: "https://example.com", capturedAt: "2026-11-06T04:00:00Z",
    viewport: {width:1280,height:800},
    pages: [{
      path: "/", title: "Example Services", screenshotUrl: "browser-screenshot.png",
      landmarks: [{role:"h1",text:"Example Services"}],
      interactions: [{kind:"link",label:"About",target:"/about",verified:false}],
    }],
    warnings: ["No interaction verification"],
  });
  assert.equal(evidence.screenshot.accessibleToGenerator, false);
  const approved = {
    industry: "Consulting",
    description: "Consulting and support for businesses in the local area.",
    services: ["Consulting", "Support"],
  };
  assert.throws(() => generateReviewedCaptureSite(evidence, approved, false));
  const site = generateReviewedCaptureSite(evidence, approved, true);
  assert.equal(site.pages.length, 4);
  const qa = recordDraftQuality(site.pages);
  assert.equal(qa.status, "passed", qa.errors.join("; "));
  assert.equal(qa.browserInteractionsVerified, false);
  assert.equal(preflightReviewedPublication(site.pages, false).allowed, false);
  assert.equal(preflightReviewedPublication(site.pages, true).allowed, true);
});
