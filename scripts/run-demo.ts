import { spawn } from "node:child_process";
import path from "node:path";
import { demoName, readyDemo } from "./demo-workspace";

try {
  const name = demoName();
  const { database } = await readyDemo(name);
  const port = process.env.DEMO_PORT ?? "3000";
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw Error("DEMO_PORT must be a port between 1 and 65535.");
  const command = process.env.DEMO_SERVER === "production" ? "start" : "dev";
  const child = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), command, "--hostname", "127.0.0.1", "--port", port], {
    env: { ...process.env, DATABASE_URL: `file:${database}`, STORE_MODE: "preview", NEXT_DIST_DIR: command === "start" ? ".next-production" : `.next-demo-${name}` },
    stdio: "inherit",
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
  child.on("error", () => { console.error("Unable to start the local demo server."); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to open demo workspace.");
  process.exitCode = 1;
}
