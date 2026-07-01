import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3022",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm --filter web dev --hostname 127.0.0.1 --port 3022",
    url: "http://127.0.0.1:3022",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_GOOGLE_API_KEY: "mvp-smoke-api-key",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID:
        "1234567890-mvp-smoke.apps.googleusercontent.com",
      NEXT_PUBLIC_GOOGLE_APP_ID: "1234567890",
      NEXT_PUBLIC_PHASE2_RUN_MODE: "fixture",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
