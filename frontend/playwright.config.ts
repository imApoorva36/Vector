import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.PLAYWRIGHT_PORT || "3100";
const e2eBaseUrl = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90 * 1000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: `npm run dev -- --port ${e2ePort}`,
        url: e2eBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000,
      },
});
