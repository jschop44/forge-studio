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
  await expect(tabs.getByRole("button", { name: "Services" })).toBeVisible();
  await tabs.getByRole("button", { name: "Services" }).click();
  await expect(tabs.getByRole("button", { name: "Services" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTitle(/Website preview: Services/i)).toBeVisible();
  await page.getByRole("button", { name: /switch to 390 pixel mobile website preview/i }).click();
  await expect(page.getByRole("button", { name: /switch to 390 pixel mobile website preview/i })).toHaveAttribute("aria-pressed", "true");
});
