import assert from "node:assert/strict";
import test from "node:test";
import { validateBrowserEvidence } from "../src/lib/browser-evidence";
const sample=(sourceUrl:string)=>({
 version:1,sourceUrl,capturedAt:"2026-11-06T12:00:00Z",
 viewport:{width:1280,height:800},
 pages:[{path:"/",title:"Example",landmarks:[],interactions:[],
 visualRegions:[{role:"main",x:0,y:0,width:1280,height:800}]}],warnings:[],
});
test("browser evidence rejects local and private IP hosts",()=>{
 for(const host of ["https://localhost","https://127.0.0.1","https://192.168.1.2","https://10.0.0.1","https://[::1]","https://host.internal"]) {
  assert.equal(validateBrowserEvidence(sample(host)),false,host);
 }
 assert.equal(validateBrowserEvidence(sample("https://example.com")),true);
});
test("browser evidence rejects invalid visual geometry",()=>{
 const value=sample("https://example.com");
 value.pages[0].visualRegions[0].width=5000;
 assert.equal(validateBrowserEvidence(value),false);
});
