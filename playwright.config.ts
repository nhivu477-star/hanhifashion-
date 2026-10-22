import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";

const { database } = JSON.parse(readFileSync(".test-credentials.json", "utf8"));
if (
  typeof database !== "string" ||
  !/^file:\.\/test-[a-f0-9]{16}\.db$/.test(database)
)
  throw new Error("Run npm run test:e2e to prepare an isolated test database");
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next dev --turbopack --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: database,
      NEXT_DIST_DIR: ".next-test",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
