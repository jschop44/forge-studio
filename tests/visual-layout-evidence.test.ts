import assert from "node:assert/strict";
import test from "node:test";
import { VisualLayoutEvidenceSchema, summarizeVisualLayout } from "../src/lib/visual-layout-evidence";
const evidence = () => ({
  sourceUrl:"https://example.com",
  viewport:{width:1280,height:800},
  regions:[{role:"hero",x:0,y:120,width:1280,height:400,text:"Welcome"}],
  capturedAt:"2026-11-06T12:00:00Z",
});
test("summarizes measured layout without pretending to analyze pixels",()=>{
  const result=summarizeVisualLayout(evidence());
  assert.equal(result.regionCount,1);
  assert.equal(result.heroPosition?.height,400);
  assert.equal(result.screenshotPixelsAnalyzed,false);
});
test("rejects out-of-bounds visual measurements",()=>{
  const invalid={...evidence(),regions:[{role:"hero",x:900,y:120,width:800,height:400}]};
  assert.equal(VisualLayoutEvidenceSchema.safeParse(invalid).success,false);
});
