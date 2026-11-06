import assert from "node:assert/strict";
import test from "node:test";
import { generateBusinessWebsite } from "../src/lib/business-site";
import { preflightReviewedPublication } from "../src/lib/reviewed-publication-preflight";
const site = () => generateBusinessWebsite({
  businessName: "Example Services", industry: "Consulting",
  description: "Consulting and support for businesses in the local area.",
  services: ["Consulting", "Support"],
});
test("publishing preflight requires explicit owner approval", () => {
  assert.equal(preflightReviewedPublication(site().pages, false).allowed, false);
  const approved = preflightReviewedPublication(site().pages, true);
  assert.equal(approved.allowed, true);
  assert.equal(approved.deployed, false);
});
test("publishing preflight rejects malformed drafts even when approved", () => {
  const broken = [{slug:"index",title:"Home",html:"broken"}];
  assert.equal(preflightReviewedPublication(broken, true).allowed, false);
  assert.equal(preflightReviewedPublication([], true).allowed, false);
});
