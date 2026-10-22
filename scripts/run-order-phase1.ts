import { createServer } from "node:net";
import { spawn, execFileSync } from "node:child_process";
import { open, readFile, writeFile } from "node:fs/promises";
await new Promise<void>((resolve, reject) => {
  const probe = createServer();
  probe.once("error", () =>
    reject(new Error("Port 3101 is occupied; refusing to test another server")),
  );
  probe.listen(3101, "127.0.0.1", () => probe.close(() => resolve()));
});
const database = `file:./phase1-orders-${Date.now()}.db`;
const env = {
  ...process.env,
  DATABASE_URL: database,
  STORE_MODE: "preview",
  NEXT_DIST_DIR: ".next-phase1",
  NEXT_TELEMETRY_DISABLED: "1",
};
if (process.argv.includes("--ghn"))
  throw new Error("Phase 2B discontinued: local manual demo only");
const stable = process.argv.includes("--stable");
if (stable) env.NEXT_DIST_DIR = ".next-production";
const original = await readFile("next-env.d.ts", "utf8");
const file = await open("prisma/" + database.replace("file:./", ""), "wx");
await file.close();
function cmd(args: string[]) {
  execFileSync("npx", args, { env, stdio: "inherit" });
}
let server: ReturnType<typeof spawn> | undefined;
try {
  cmd(["prisma", "migrate", "deploy"]);
  cmd(["tsx", "scripts/prepare-order-phase1.ts"]);
  if (stable && !process.argv.includes("--reuse-build")) cmd(["next", "build"]);
  if (stable && process.argv.includes("--reuse-build"))
    await readFile(".next-production/BUILD_ID", "utf8");
  server = spawn(
    "node",
    [
      "node_modules/next/dist/bin/next",
      stable ? "start" : "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3101",
    ],
    { env, stdio: ["ignore", "ignore", "inherit"] },
  );
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) throw Error("Test server exited");
    try {
      const r = await fetch("http://127.0.0.1:3101/api/session");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {
      /* server starting */
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }
  if (!ready) throw Error("Test server did not start");
  cmd(["tsx", "scripts/test-order-phase1.ts"]);
  const phases = [
    ["--shipping", "scripts/test-shipping-phase2a.ts"],
    ["--returns", "scripts/test-returns-phase3.ts"],
    ["--rbac", "scripts/test-rbac-phase4.ts"],
    ["--phase5", "scripts/test-phase5.ts"],
    ["--phase6", "scripts/test-analytics-phase6.ts"],
  ] as const;
  const lastPhase = phases.reduce(
    (last, [flag], index) => (process.argv.includes(flag) ? index : last),
    -1,
  );
  for (let index = 0; index <= lastPhase; index++)
    cmd(["tsx", phases[index][1]]);
  if (process.argv.includes("--acceptance"))
    cmd(["tsx", "scripts/test-business-acceptance.ts"]);
} finally {
  if (server) {
    server.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      if (server!.exitCode !== null) resolve();
      else server!.once("exit", () => resolve());
    });
  }
  await writeFile("next-env.d.ts", original);
}
