import assert from "node:assert/strict";
import test from "node:test";
import { prepareBrowserEvidenceGeneration } from "../src/lib/browser-evidence-generation";

const capture = {
  captureId: "sample-2",
  capturedAt: "2026-11-06T03:30:00Z",
  sourceUrl: "https://example.com",
  provenance: "authorized-capture",
  screenshot: { artifactRef: "capture/sample-2.png", accessibleToGenerator: true, width: 1280, height: 800 },
  title: "Example Company",
  headings: ["Services", "About", "Contact"],
  navigation: [{ label: "Contact", href: "https://example.com/contact" }],
};

test("prepares a bounded draft without granting publish permission", () => {
  const draft = prepareBrowserEvidenceGeneration(capture);
  assert.equal(draft.reviewRequired, true);
  assert.equal(draft.publishAllowed, false);
  assert.equal(draft.title, "Example Company");
  assert.equal(draft.sections.length, 3);
  assert.equal(draft.links[0].verified, false);
  assert.equal(draft.screenshot.analyzed, false);
});

test("rejects injected fields and unsupported URL schemes", () => {
  assert.throws(() => prepareBrowserEvidenceGeneration({ ...capture, publishAllowed: true }));
  assert.throws(() => prepareBrowserEvidenceGeneration({ ...capture, sourceUrl: "file:///etc/passwd" }));
});
