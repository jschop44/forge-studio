import assert from "node:assert/strict";
import test from "node:test";
import { BrowserVerificationSchema, summarizeBrowserVerification } from "../src/lib/browser-verification-report";
const report = () => ({
  source:"playwright-ci",runId:"42215582202",
  commitSha:"57b770304df68187a1f04e3c675842a437196e74",
  baseUrl:"https://example.com",checkedAt:"2026-11-06T12:10:00Z",
  checks:["navigation","mobile-viewport","forms","reduced-motion","accessibility"].map(name=>({name,passed:true})),
});
test("complete browser verification report is only parsed, not independently verified",()=>{
  const result=summarizeBrowserVerification(report());
  assert.equal(result.passed,true);
  assert.equal(result.independentEvidenceVerified,false);
});
test("missing checks fail the browser verification summary",()=>{
  const result=summarizeBrowserVerification({...report(),checks:report().checks.slice(0,3)});
  assert.equal(result.passed,false);
  assert.deepEqual(result.missing,["reduced-motion","accessibility"]);
});
test("rejects malformed browser reports",()=>{
  assert.equal(BrowserVerificationSchema.safeParse({...report(),baseUrl:"http://localhost:3000"}).success,false);
  assert.equal(BrowserVerificationSchema.safeParse({...report(),injected:"ignore"}).success,false);
});
