import { defineConfig } from "@playwright/test";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const { database } = JSON.parse(readFileSync(".test-credentials.json", "utf8"));
try {
  const filename = typeof database === "string" && database.startsWith("file:")
    ? database.slice(5)
    : "";
  const relative = path.relative(path.resolve(".local-demo"), filename).split(path.sep).join("/");
  if (
    !path.isAbsolute(filename) ||
    !/^browser-[a-f0-9]{16}\/demo\.db$/.test(relative) ||
    realpathSync(filename) !== filename ||
    !lstatSync(filename).isFile()
  ) throw new Error("Invalid browser database");
} catch {
  throw new Error("Run pnpm test:e2e to prepare an isolated browser database");
}
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
    command: "npx next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: database,
      NEXT_DIST_DIR: ".next-test",
      STORE_MODE: "preview",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
  reporter: process.env.CI ? [["list"]] : [["list"], ["html", { open: "never" }]],
});
