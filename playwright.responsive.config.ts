import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:6400";

/**
 * The same layout checks at the three widths that matter here.
 *
 * 393px is an iPhone 15 Pro, the narrowest screen in the family; 768px is the
 * breakpoint where the study controls stop stretching, which is where an
 * anchor flips and so where a mistake hides; 1440px is the desktop.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/auth.setup.ts", "**/responsive.spec.ts"],
  timeout: 60_000,
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
    /*
     * An iPhone 15 Pro's viewport on Chromium rather than the WebKit device
     * preset: the rest of the suite installs Chromium only, and what is under
     * test is the layout at this width, not the engine.
     */
    {
      name: "phone",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 393, height: 852 },
        isMobile: false,
        hasTouch: true,
        storageState: "e2e/.auth/session.json",
      },
    },
    {
      name: "tablet",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        storageState: "e2e/.auth/session.json",
      },
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "e2e/.auth/session.json",
      },
    },
  ],
});
