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


test("valid internal page and fragment destinations remain reviewable",()=>{
 const wrap=(title:string,body:string)=>'<!doctype html><html><head><title>'+title+'</title><meta name="viewport" content="width=device-width"></head><body><main id="main-content">'+body+'</main></body></html>';
 const pages=[
  {slug:"index",title:"Home",html:wrap("Home",'<h1>Welcome</h1><a href="#main-content">Skip to content</a><a href="./services.html#offering-0">Coffee beans</a><a href="/services.html?view=all#offering-1">Mugs</a>')},
  {slug:"services",title:"Services",html:wrap("Services",'<h1>Services</h1><article id="offering-0">Coffee beans</article><article id="offering-1">Ceramic mugs</article><a href="index.html#main-content">Home</a>')}
 ];
 const report=auditGeneratedDraft(pages);
 assert.equal(report.readyForReview,true,report.errors.join("; "));
});
test("missing section anchors and placeholder links prevent a fake working preview",()=>{
 const wrap=(body:string)=>'<!doctype html><html><head><title>Website</title></head><body><main><h1>Business</h1>'+body+'</main></body></html>';
 const pages=[
  {slug:"index",title:"Home",html:wrap('<a href="services.html#offering-7">Missing service</a><a href="#fake">Missing section</a><a href="#">Dead CTA</a>')},
  {slug:"services",title:"Services",html:wrap('<article id="offering-1">Actual offering</article>')}
 ];
 const report=auditGeneratedDraft(pages);
 assert.equal(report.readyForReview,false);
 assert.ok(report.errors.some(error=>error.includes("services#offering-7")));
 assert.ok(report.errors.some(error=>error.includes("index#fake")));
 assert.ok(report.errors.some(error=>error.includes("nonfunctional")));
});
test("unsafe destinations, malformed fragments and data-id decoys are rejected",()=>{
 const html='<!doctype html><html><head><title>Shop</title></head><body><main><h1>Shop</h1><div data-id="fake"></div><a href="#fake">Missing fragment</a><a href="#bad%XX">Bad encoding</a><a href="javascript:void(0)">No action</a><a href="mailto:hello@example.com">Email</a><a href="https://example.com">External</a></main></body></html>';
 const report=auditGeneratedDraft([{slug:"index",title:"Home",html}]);
 assert.equal(report.readyForReview,false);
 assert.ok(report.errors.some(error=>error.includes("index#fake")));
 assert.ok(report.errors.some(error=>error.includes("malformed internal link fragment")));
 assert.ok(report.errors.some(error=>error.includes("nonfunctional or unsafe link")));
});
test("actual interactive product navigation still passes static fragment checks",()=>{
 const website=generateBusinessWebsite({
  businessName:"Harbor Coffee",industry:"Coffee shop",
  description:"Roasted coffee beans and ceramic mugs from our neighborhood café.",
  services:["Coffee beans","Ceramic mugs"],
  experienceStyle:"object-navigation"
 });
 const report=auditGeneratedDraft(website.pages);
 assert.equal(report.readyForReview,true,report.errors.join("; "));
});


test("empty, placeholder and unsafe contact forms block a reviewable generated site",()=>{
 const wrap=(form:string)=>'<!doctype html><html><head><title>Contact</title><meta name="viewport" content="width=device-width"></head><body><main><h1>Contact the team</h1><p>Ask our company about your upcoming project and services.</p>'+form+'</main></body></html>';
 for(const action of ['', ' action="#"',' action="#contact"',' action="javascript:void(0)"',' action="http://example.com/submit"',' action="//outside.example/submit"']){
  const form='<form'+action+' method="post"><input name="email"><button type="submit">Send inquiry</button></form>';
  const report=auditGeneratedDraft([{slug:'index',title:'Contact',html:wrap(form)}]);
  assert.equal(report.readyForReview,false,action);
  assert.ok(report.errors.some(error=>error.includes('form ')&&error.includes('destination')||error.includes('form submission scheme')),JSON.stringify(report.errors));
 }
});
test("explicit HTTPS or owned API form actions remain reviewable but never claim verified delivery",()=>{
 const wrap=(form:string)=>'<!doctype html><html><head><title>Contact</title></head><body><main><h1>Contact</h1><p>Tell the service team about your next project.</p>'+form+'</main></body></html>';
 for(const action of ['https://forms.example.com/intake','/api/contact']){
  const page={slug:'contact',title:'Contact',html:wrap('<form action="'+action+'" method="post"><input name="email"><button type="submit">Contact us</button></form>')};
  const result=auditGeneratedDraft([page]);
  assert.equal(result.readyForReview,true,result.errors.join('; '));
  assert.equal(result.readyForPublishing,false);
  assert.ok(result.warnings.some(warning=>warning.includes('backend and delivery remain unverified')));
 }
});
