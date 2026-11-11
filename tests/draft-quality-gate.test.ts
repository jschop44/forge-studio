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


test("blocks a styled but empty generated page instead of offering a blank preview",()=>{
 const page={slug:"index",title:"Home",html:'<!doctype html><html><head><title>Blank site</title><meta name="viewport" content="width=device-width"></head><body><main style="background:#112233"><section></section></main></body></html>'};
 const report=auditGeneratedDraft([page]);
 assert.equal(report.readyForReview,false);
 assert.ok(report.errors.some(e=>e.includes("empty main content")));
});
test("reports repeated product photos but permits company logos across pages",()=>{
 const picture='https://images.example.com/wings.jpg?crop=wide';
 const html=(src:string)=>'<!doctype html><html><head><title>Restaurant</title></head><body><nav><img class="source-brand-logo" src="/logo.png" alt="Company logo"></nav><main><h1>Restaurant</h1><p>Our family restaurant serves food prepared fresh each day.</p><img src="'+src+'" alt="Chicken wings"></main></body></html>';
 const pages=[{slug:"index",title:"Home",html:html(picture)},{slug:"services",title:"Menu",html:html('https://images.example.com/wings.jpg?crop=square')}];
 const report=auditGeneratedDraft(pages);
 assert.equal(report.readyForReview,true);
 assert.equal(report.warnings.filter(w=>w.includes("Repeated content image")).length,1);
 assert.ok(report.warnings.some(w=>w.includes("wings.jpg")));
 assert.ok(!report.warnings.some(w=>w.includes("/logo.png")));
});
test("does not report diverse photos or duplicate image use within a single page as cross-page repetition",()=>{
 const first='<img src="https://images.example.com/pizza.jpg" alt="Pizza">';
 const second='<img src="https://images.example.com/wings.jpg" alt="Wings">';
 const build=(body:string)=>'<!doctype html><html><head><title>Restaurant</title></head><body><main><h1>Restaurant</h1><p>Our family restaurant serves fresh food and drinks.</p>'+body+'</main></body></html>';
 const pages=[{slug:"index",title:"Home",html:build(first+first)},{slug:"services",title:"Menu",html:build(second)}];
 assert.ok(!auditGeneratedDraft(pages).warnings.some(w=>w.includes("Repeated content image")));
});
