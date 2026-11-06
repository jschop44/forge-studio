import { test, expect } from "@playwright/test";

test("home page loads with an accessible document heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
});

test("business builder loads and exposes a website generation control", async ({ page }) => {
  await page.goto("/business");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByRole("button", { name: /generate my immersive website/i })).toBeVisible();
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

test("free generator produces preview pages and navigates tabs", async ({ page }) => {
  await page.goto("/business");
  await page.getByPlaceholder("e.g. Northstar Coffee").fill("Northstar Coffee");
  await page.getByRole("button", { name: /generate my immersive website/i }).click();
  const tabs = page.getByRole("navigation", { name: "Website pages" });
  await expect(tabs).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Draft quality:/i)).toBeVisible();
  await expect(page.getByText(/Publishing has not been verified/i)).toBeVisible();
  const approvePublish=page.getByRole("checkbox", { name: /reviewed every generated page and approve publishing/i });
  await expect(approvePublish).not.toBeChecked();
  await expect(page.getByRole("button", { name: /publish approved draft/i })).toBeDisabled();
  await approvePublish.check();
  await expect(page.getByRole("button", { name: /publish approved draft/i })).toBeEnabled();
  await page.getByPlaceholder("e.g. Northstar Coffee").fill("Northstar Roasters");
  await expect(approvePublish).not.toBeChecked();
  await expect(page.getByRole("button", { name: /publish approved draft/i })).toBeDisabled();
  await page.getByPlaceholder("Publication UUID, leave blank for a new website").fill("00000000-0000-4000-8000-000000000001");
  await expect(approvePublish).not.toBeChecked();
  await expect(page.getByRole("button", { name: /publish approved draft/i })).toBeDisabled();
  await expect(tabs.getByRole("button", { name: "Services" })).toBeVisible();
  await tabs.getByRole("button", { name: "Services" }).click();
  await expect(tabs.getByRole("button", { name: "Services" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTitle(/Website preview: Services/i)).toBeVisible();
  await page.getByRole("button", { name: /switch to 390 pixel mobile website preview/i }).click();
  await expect(page.getByRole("button", { name: /switch to 390 pixel mobile website preview/i })).toHaveAttribute("aria-pressed", "true");
});


test("business publication routes remain disabled by default", async ({ request }) => {
  const id="00000000-0000-4000-8000-000000000001";
  const published=await request.get("/business-sites/"+id+"/index");
  expect(published.status()).toBe(503);
  expect(published.headers()["cache-control"]).toBe("no-store");
  const create=await request.post("/api/business/publish",{data:{}});
  expect(create.status()).toBe(503);
});
