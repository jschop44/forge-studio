import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: 1,
  reporter: [["list"], ["html", {open:"never",outputFolder:"playwright-report"}]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
