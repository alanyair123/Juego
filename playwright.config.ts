import { defineConfig, devices } from "@playwright/test";
import { TEST_AUTH_SECRET } from "./e2e/auth-constants";

const ci = Boolean(process.env.CI);
const baseURL = "http://localhost:3000";
const commonEnv = {
  AUTH_SECRET: TEST_AUTH_SECRET,
  AUTH_TRUST_HOST: "true",
  NEXT_PUBLIC_SOCKET_URL: "http://localhost:4000",
  CORS_ORIGIN: baseURL,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: ci ? 1 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run server:start",
      url: "http://localhost:4000/health",
      reuseExistingServer: !ci,
      timeout: 30_000,
      env: commonEnv,
    },
    {
      command: "npm run build && npm run start",
      url: baseURL,
      reuseExistingServer: !ci,
      timeout: 180_000,
      env: {
        ...commonEnv,
        ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
      },
    },
  ],
  outputDir: "test-results",
});
