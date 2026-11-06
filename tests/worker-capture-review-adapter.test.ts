import assert from "node:assert/strict";
import test from "node:test";
import { workerCaptureToReviewEvidence } from "../src/lib/worker-capture-review-adapter";
import { proposeBusinessSiteFromCapture } from "../src/lib/capture-business-proposal";

const worker = () => ({
  version: 1,
  sourceUrl: "https://example.com",
  capturedAt: "2026-11-06T03:00:00Z",
  viewport: { width: 1280, height: 800 },
  pages: [{
    path: "/",
    title: "Example Services",
    screenshotUrl: "browser-screenshot.png",
    landmarks: [{ role: "h1", text: "Welcome" }, { role: "nav", text: "About" }],
    interactions: [
      { kind: "link", label: "About", target: "/about", verified: false },
      { kind: "link", label: "Other", target: "https://outside.example/", verified: false },
      { kind: "link", label: "Script", target: "javascript:alert(1)", verified: false },
    ],
  }],
  warnings: ["Interactions not executed"],
});

test("worker evidence becomes a review-only proposal without claiming visual analysis", () => {
  const evidence = workerCaptureToReviewEvidence(worker());
  assert.equal(evidence.screenshot.accessibleToGenerator, false);
  assert.deepEqual(evidence.navigation.map(link => link.href), ["https://example.com/about"]);
  const proposal = proposeBusinessSiteFromCapture(evidence);
  assert.equal(proposal.businessName, "Example Services");
  assert.equal(proposal.publishAllowed, false);
  assert.deepEqual(proposal.observedHeadings, ["Welcome"]);
  assert.match(proposal.warnings.join(" "), /not been transferred/);
});

test("rejects malformed worker captures", () => {
  assert.throws(() => workerCaptureToReviewEvidence({ ...worker(), version: 2 }));
  assert.throws(() => workerCaptureToReviewEvidence({ ...worker(), pages: [] }));
  assert.throws(() => workerCaptureToReviewEvidence({ ...worker(), sourceUrl: "http://localhost/" }));
});

test("includes evidence-grounded broken navigation recommendations for owner review",()=>{
 const capture=worker();
 const page={...capture.pages[0],navigationChecks:[{path:'/missing',status:404,ok:false,verifiedBy:'navigation-get'}]};
 const evidence=workerCaptureToReviewEvidence({...capture,pages:[page]});
 assert.match(evidence.captureErrors.join(' '),/\/missing/);
 assert.match(evidence.captureErrors.join(' '),/correct the internal link target/);
});
