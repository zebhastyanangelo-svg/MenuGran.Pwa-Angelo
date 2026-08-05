import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for MenuGran dual-role E2E.
 *
 * Targets the Next.js app (default http://localhost:3000). Set BASE_URL
 * to point at staging/prod if needed. Both client and operator use the
 * same base URL but separate browser contexts.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared DB state during dual-role flow
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "dual-role",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
