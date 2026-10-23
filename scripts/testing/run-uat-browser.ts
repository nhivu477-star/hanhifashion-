import { createServer } from "node:net";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, open, readFile, realpath, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
await new Promise<void>((resolve, reject) => {
  const p = createServer();
  p.once("error", () => reject(Error("UAT port 3102 already occupied")));
  p.listen(3102, "127.0.0.1", () => p.close(() => resolve()));
});
if (await realpath("prisma") !== path.resolve("prisma"))
  throw Error("UAT database directory must not contain symbolic links.");
const name = `final-uat-browser-${Date.now()}.db`;
const file = await open("prisma/" + name, "wx", 0o600);
await file.close();
const imageName = `uat-${randomUUID()}.webp`;
const env = {
  ...process.env,
  DATABASE_URL: "file:./" + name,
  STORE_MODE: "preview",
  NEXT_DIST_DIR: ".next-production",
  NEXT_TELEMETRY_DISABLED: "1",
  UAT_IMAGE_NAME: imageName,
};
await mkdir("verification/final-uat", { recursive: true });
const original = await readFile("next-env.d.ts", "utf8");
execFileSync("npx", ["prisma", "migrate", "deploy"], {
  env,
  stdio: "inherit",
});
execFileSync("npx", ["tsx", "scripts/testing/prepare-uat.ts"], {
  env,
  stdio: "inherit",
});
const server = spawn(
  "node",
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3102",
  ],
  { env, stdio: ["ignore", "ignore", "inherit"] },
);
try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) throw Error("UAT server exited");
    try {
      if ((await fetch("http://127.0.0.1:3102/api/session")).ok) {
        ready = true;
        break;
      }
    } catch {
      /* starting */
    }
    await new Promise<void>((r) => {
      setTimeout(r, 500);
    });
  }
  if (!ready) throw Error("UAT server unavailable");
  execFileSync(
    "npx",
    [
      "playwright",
      "test",
      "--config",
      "playwright.uat.config.ts",
      ...process.argv.slice(2),
    ],
    { env, stdio: "inherit" },
  );
  execFileSync(
    "python3",
    [
      "scripts/local-backup.py",
      "--source",
      "prisma/" + name,
      "--directory",
      "verification/final-uat/test-backups",
    ],
    { env, stdio: "inherit" },
  );
} finally {
  server.kill("SIGTERM");
  await new Promise<void>((r) => {
    if (server.exitCode !== null) r();
    else server.once("exit", () => r());
  });
  await writeFile("next-env.d.ts", original);
  await unlink(path.join("public/uploads", imageName));
}
