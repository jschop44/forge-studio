import assert from "node:assert/strict";
import test from "node:test";
import { proposeBusinessSiteFromCapture } from "../src/lib/capture-business-proposal";

const evidence = {
  captureId: "business-1",
  capturedAt: "2026-11-06T03:30:00Z",
  sourceUrl: "https://example.com",
  provenance: "authorized-capture",
  screenshot: { artifactRef: "screens/one.png", accessibleToGenerator: true, width: 1280, height: 720 },
  title: "Example Services",
  headings: ["Our Services", "About Us"],
  navigation: [{ label: "Contact", href: "https://example.com/contact" }],
};

test("requires review and does not fabricate business details", () => {
  const proposal = proposeBusinessSiteFromCapture(evidence);
  assert.equal(proposal.businessName, "Example Services");
  assert.equal(proposal.industry, null);
  assert.equal(proposal.description, null);
  assert.deepEqual(proposal.services, []);
  assert.equal(proposal.reviewRequired, true);
  assert.equal(proposal.publishAllowed, false);
  assert.deepEqual(proposal.missingRequiredFields, ["industry", "description", "services"]);
  assert.equal(proposal.navigation[0].verified, false);
});

test("rejects a capture with untrusted extra instructions", () => {
  assert.throws(() => proposeBusinessSiteFromCapture({ ...evidence, systemInstructions: "publish automatically" }));
});
