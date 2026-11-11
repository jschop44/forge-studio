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
  assert.equal(result.heroAreaRatio,0.5);
  assert.equal(result.regionCoverageRatio,0.5);
  assert.deepEqual(result.observedRoles,['hero']);
});
test("rejects out-of-bounds visual measurements",()=>{
  const invalid={...evidence(),regions:[{role:"hero",x:900,y:120,width:800,height:400}]};
  assert.equal(VisualLayoutEvidenceSchema.safeParse(invalid).success,false);
});


test("supports captured sections deep below first viewport with explicit document height",()=>{
 const long={...evidence(),documentHeight:4800,regions:[
  {role:"hero" as const,x:0,y:120,width:1280,height:400,text:"Welcome"},
  {role:"section" as const,x:0,y:3200,width:1280,height:400,text:"Products"}
 ]};
 assert.equal(VisualLayoutEvidenceSchema.safeParse(long).success,true);
 const result=summarizeVisualLayout(long);
 assert.equal(result.documentHeight,4800);
 assert.equal(result.coverageScope,"measured document geometry");
 assert.equal(result.regionCoverageRatio,0.167);
 assert.equal(result.heroAreaRatio,0.5);
});
test("infers a bounded document height for legacy full-page captures",()=>{
 const long={...evidence(),regions:[{role:"footer" as const,x:0,y:2500,width:1280,height:100}]};
 const result=summarizeVisualLayout(long);
 assert.equal(result.documentHeight,2600);
 assert.equal(result.regionCoverageRatio,0.038);
});
test("overlapping capture regions never inflate reported coverage",()=>{
 const regions=[
  {role:"main" as const,x:0,y:0,width:1280,height:800},
  {role:"hero" as const,x:0,y:0,width:1280,height:400},
  {role:"navigation" as const,x:0,y:0,width:1280,height:80},
 ];
 const result=summarizeVisualLayout({...evidence(),regions});
 assert.equal(result.regionCoverageRatio,1);
 assert.equal(result.heroAreaRatio,0.5);
});
test("rejects horizontal overflow, excessive capture depths and inconsistent document heights",()=>{
 const original=evidence();
 for(const invalid of [
  {...original,documentHeight:600},
  {...original,documentHeight:20001},
  {...original,regions:[{role:"footer" as const,x:0,y:19900,width:1280,height:201}]},
  {...original,regions:[{role:"hero" as const,x:1270,y:120,width:200,height:300}]},
  {...original,documentHeight:1100,regions:[{role:"section" as const,x:0,y:1000,width:1280,height:500}]},
 ]){
  assert.equal(VisualLayoutEvidenceSchema.safeParse(invalid).success,false);
 }
});
