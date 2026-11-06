import assert from "node:assert/strict";
import test from "node:test";
import { generateBusinessWebsite } from "../src/lib/business-site";
import { assessDeploymentReadiness } from "../src/lib/deployment-readiness";
const pages = generateBusinessWebsite({
  businessName: "Example Services", industry: "Consulting",
  description: "Consulting and support for businesses in the local area.",
  services: ["Consulting", "Support"],
}).pages;
test("passing build and QA never imply a live deployment", () => {
  const result = assessDeploymentReadiness({
    pages, ownerApproved:true, browserVerified:false,
    productionHealthVerified:false, publicPagesVerified:false, rollbackVerified:false,
  });
  assert.equal(result.staticQaPassed,true);
  assert.equal(result.ready,false);
  assert.equal(result.blockers.length,4);
});
test("deployment readiness requires every independent verification", () => {
  const result = assessDeploymentReadiness({
    pages, ownerApproved:true, browserVerified:true,
    productionHealthVerified:true, publicPagesVerified:true, rollbackVerified:true,
  });
  assert.equal(result.ready,true);
  assert.deepEqual(result.blockers,[]);
});
