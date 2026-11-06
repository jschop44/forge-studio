import assert from "node:assert/strict";
import test from "node:test";
import { generateBusinessWebsite } from "../src/lib/business-site";
import { auditGeneratedDraft } from "../src/lib/draft-quality-gate";

test("audits actual four-page generated business site", () => {
  const site = generateBusinessWebsite({
    businessName: "Example Services",
    industry: "Consulting",
    description: "Consulting and support for businesses in the local area.",
    services: ["Consulting", "Support"],
  });
  const result = auditGeneratedDraft(site.pages);
  assert.equal(result.readyForReview, true, result.errors.join("; "));
  assert.equal(result.readyForPublishing, false);
  assert.equal(result.pageCount, 4);
});

test("detects missing internal pages and duplicate slugs", () => {
  const html = '<!doctype html><html><head><title>Test</title></head><body><h1>Test</h1><a href="missing.html">Missing</a></body></html>';
  const result = auditGeneratedDraft([{ slug: "index", title: "Home", html }, { slug: "index", title: "Home", html }]);
  assert.equal(result.readyForReview, false);
  assert.ok(result.errors.some(error => error.includes("Duplicate")));
  assert.ok(result.errors.some(error => error.includes("broken internal link")));
});
