import { test, expect, type Page } from "@playwright/test";
import {generateBusinessWebsite} from '../src/lib/business-site';

// Browser UI fixture only. Real inference is verified by the separate AI smoke workflows.
async function fixtureGeneration(page:Page,tall=false){
 await page.route('**/api/ai/business',async route=>{
  expect(route.request().method()).toBe('POST');
  const input=route.request().postDataJSON();
  expect(input.businessName).toBe('Northstar Coffee');
  const draft={businessName:input.businessName,industry:input.industry,description:'Freshly roasted coffee and welcoming service for our local community.',services:input.services};
  const pages=generateBusinessWebsite({...draft,experienceStyle:input.experienceStyle}).pages.map(p=>tall?{...p,html:p.html.replace('</head>','<style>main{min-height:5000px}</style></head>')}:p);
  await route.fulfill({status:200,json:{draft,provider:'browser-test-fixture',pages}});
 });
}


test("home page loads with an accessible document heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
});

test('phone preview retains 390 content pixels while a long page scrolls',async({page})=>{
 await fixtureGeneration(page,true);
 await page.goto('/business');
 await page.getByPlaceholder('e.g. Northstar Coffee').fill('Northstar Coffee');
 await page.getByRole('button',{name:/generate my website/i}).click();
 await expect(page.getByRole('navigation',{name:'Website pages'})).toBeVisible({timeout:30000});
 await page.getByRole('button',{name:/switch to 390 pixel mobile website preview/i}).click();
 const root=page.frameLocator('iframe').locator('html');
 await expect.poll(()=>root.evaluate(el=>el.clientWidth)).toBe(390);
 expect(await root.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
});

test("business builder loads and exposes a website generation control", async ({ page }) => {
  await page.goto("/business");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByRole("button", { name: /generate my website/i })).toBeVisible();
});

test("mobile builder does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/business");
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 2);
});

test("fixture-backed generation displays preview pages and navigates tabs", async ({ page }) => {
  await fixtureGeneration(page);
  await page.goto("/business");
  await page.getByPlaceholder("e.g. Northstar Coffee").fill("Northstar Coffee");
  await page.getByRole("button", { name: /generate my website/i }).click();
  const tabs = page.getByRole("navigation", { name: "Website pages" });
  await expect(tabs).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Automatic website check:/i)).toBeVisible();
  const technicalDetails=page.getByRole('button',{name:'Show technical check details'});
  await expect(technicalDetails).toHaveAttribute('aria-expanded','false');
  await technicalDetails.click();
  await expect(page.getByRole('button',{name:'Hide technical check details'})).toHaveAttribute('aria-expanded','true');
  await expect(page.getByText(/Publishing has not been verified/i)).toBeVisible();
  const approvePublish=page.getByRole("checkbox", { name: /reviewed every generated page and approve publishing/i });
  await expect(approvePublish).not.toBeChecked();
  await expect(page.getByRole("button", { name: /publish approved draft/i })).toBeDisabled();
  await approvePublish.check();
  await expect(page.getByRole("button", { name: /publish approved draft/i })).toBeEnabled();
  await page.getByPlaceholder("e.g. Northstar Coffee").fill("Northstar Roasters");
  await expect(approvePublish).not.toBeChecked();
  await expect(page.getByRole("button", { name: /publish approved draft/i })).toBeDisabled();
  await page.getByText("Update an existing published website",{exact:true}).click();
  await page.getByPlaceholder("Publication UUID, leave blank for a new website").fill("00000000-0000-4000-8000-000000000001");
  await expect(approvePublish).not.toBeChecked();
  await expect(page.getByRole("button", { name: /publish approved draft/i })).toBeDisabled();
  await expect(tabs.getByRole("button")).toHaveCount(4);
  await expect(tabs.getByRole("button", { name: "Menu" })).toBeVisible();
  await tabs.getByRole("button", { name: "Menu" }).click();
  await expect(tabs.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTitle(/Website preview: Menu/i)).toBeVisible();
  await page.getByRole("button", { name: /switch to 390 pixel mobile website preview/i }).click();
  await expect(page.getByRole("button", { name: /switch to 390 pixel mobile website preview/i })).toHaveAttribute("aria-pressed", "true");
});


test("business publication routes remain disabled by default", async ({ request }) => {
  const id="00000000-0000-4000-8000-000000000001";
  const published=await request.get("/business-sites/"+id+"/index");
  expect(published.status()).toBe(503);
  expect(published.headers()["cache-control"]).toBe("no-store");
  const rejectedOrigin=await request.post("/api/business/publish",{data:{}});
  expect(rejectedOrigin.status()).toBe(403);
  // POST origin checks can reject proxy-rewritten host headers before feature gating.
  // The public GET above directly verifies the disabled feature flag.
});


test("publication management page loads and shows disabled publishing state", async ({ page }) => {
  await page.goto("/business/publications");
  await expect(page.getByRole("heading",{name:"Business website publications"})).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Business publishing is not configured");
  await expect(page.getByRole("link",{name:/back to website builder/i})).toBeVisible();
});


test("revision version lookup requires a publication ID", async ({ page }) => {
  await fixtureGeneration(page);
  await page.goto("/business");
  await page.getByPlaceholder("e.g. Northstar Coffee").fill("Northstar Coffee");
  await page.getByRole("button", { name: /generate my website/i }).click();
  await expect(page.getByRole("navigation", { name: "Website pages" })).toBeVisible({timeout:30000});
  await page.getByText("Update an existing published website",{exact:true}).click();
  const load=page.getByRole("button",{name:"Load current publication version"});
  await expect(load).toBeDisabled();
  await page.getByPlaceholder("Publication UUID, leave blank for a new website").fill("00000000-0000-4000-8000-000000000001");
  await expect(load).toBeEnabled();
  await load.click();
  await expect(page.getByText(/Business publishing is not configured/i)).toBeVisible();
});

for(const status of [503,429]){
 test('generation '+status+' response shows recovery guidance without a draft',async({page})=>{
  let requests=0;
  await page.route('**/api/ai/business',async route=>{
   requests++;
   await route.fulfill({status,headers:{'Retry-After':'7'},json:{error:'Generation unavailable'}});
  });
  await page.goto('/business');
  await page.getByPlaceholder('e.g. Northstar Coffee').fill('Northstar Coffee');
  const generate=page.getByRole('button',{name:/generate my website/i});
  await generate.click();
  const message=status===429?/retry in about 7 seconds/i:/generation is temporarily unavailable/i;
  await expect(page.getByText(message)).toBeVisible();
  await expect(generate).toBeEnabled();
  await expect(page.getByRole('navigation',{name:'Website pages'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/publish approved draft/i})).toHaveCount(0);
  expect(requests).toBe(1);
 });
}
