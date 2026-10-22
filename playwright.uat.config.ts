import { defineConfig } from "@playwright/test";
if (
  !/^file:\.\/final-uat-browser-[\w-]+\.db$/.test(
    process.env.DATABASE_URL ?? "",
  )
)
  throw Error("Final UAT browser suite requires an isolated database");
export default defineConfig({
  testDir: "tests/uat",
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  expect: { timeout: 12000 },
  use: {
    baseURL: "http://127.0.0.1:3102",
    headless: true,
    actionTimeout: 12000,
    navigationTimeout: 20000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  outputDir: "verification/final-uat/browser-artifacts",
  reporter: [
    ["list"],
    ["json", { outputFile: "verification/final-uat/browser-results.json" }],
  ],
});
