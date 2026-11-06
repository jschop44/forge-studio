import assert from "node:assert/strict";
import test from "node:test";
import { inspectionToBrowserEvidence } from "../src/lib/inspection-evidence-adapter";
import { proposeBusinessSiteFromCapture } from "../src/lib/capture-business-proposal";

test("adapts inspected site metadata without pretending screenshots exist", () => {
  const capture = inspectionToBrowserEvidence({
    url: "https://example.com",
    title: "Example Company",
    headings: ["Our Work"],
    navigation: [
      { label: "About", path: "/about" },
      { label: "External", path: "https://other.example.org/" },
      { label: "Script", path: "javascript:alert(1)" },
    ],
  });
  assert.equal(capture.screenshot.accessibleToGenerator, false);
  assert.deepEqual(capture.navigation.map((item) => item.href), ["https://example.com/about"]);
  const proposal = proposeBusinessSiteFromCapture(capture);
  assert.equal(proposal.businessName, "Example Company");
  assert.equal(proposal.publishAllowed, false);
  assert.match(proposal.warnings.join(" "), /not captured/);
});

test("rejects unsafe inspection origins", () => {
  assert.throws(() => inspectionToBrowserEvidence({ url: "http://localhost:3000", title: "Local" }));
});
