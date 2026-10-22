import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const fixture = JSON.parse(
  await readFile(
    process.argv[2] ?? "verification/returns-browser-fixture.json",
    "utf8",
  ),
);
if (!/^file:\.\/business-tests-[\w-]+\.db$/.test(fixture.database))
  throw Error("Isolated DB required");
const child = spawn(
  "node",
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3101",
  ],
  {
    env: {
      ...process.env,
      DATABASE_URL: fixture.database,
      STORE_MODE: "preview",
      NEXT_DIST_DIR: ".next-production",
    },
    stdio: "inherit",
  },
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
