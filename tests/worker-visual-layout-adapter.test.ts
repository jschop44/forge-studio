import assert from "node:assert/strict";
import test from "node:test";
import { workerCaptureToVisualLayout } from "../src/lib/worker-visual-layout-adapter";
const capture=()=>({
 version:1,sourceUrl:"https://example.com",capturedAt:"2026-11-06T12:00:00Z",
 viewport:{width:1280,height:800},
 pages:[{path:"/",title:"Example",landmarks:[],interactions:[],
  visualRegions:[{role:"nav",x:0,y:0,width:1280,height:80},{role:"hero",x:0,y:80,width:1280,height:400}]}],
 warnings:[],
});
test("worker DOM measurements become normalized visual layout evidence",()=>{
 const result=workerCaptureToVisualLayout(capture());
 assert.equal(result.navigationObserved,true);
 assert.equal(result.heroPosition?.y,80);
 assert.equal(result.screenshotPixelsAnalyzed,false);
});
test("out-of-viewport worker regions are rejected",()=>{
 const broken=capture();broken.pages[0].visualRegions[1].width=5000;
 assert.throws(()=>workerCaptureToVisualLayout(broken));
});
