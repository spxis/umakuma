import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:6400";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/auth.setup.ts", "**/smoke-pages.spec.ts", "**/search.spec.ts", "**/list-page.spec.ts"],
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/session.json" },
    },
  ],
});
