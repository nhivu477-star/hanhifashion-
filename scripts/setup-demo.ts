import { spawnSync } from "node:child_process";
import path from "node:path";
import { demoName, reserveDemo, writePrivate } from "./demo-workspace";

const name = demoName();
try {
  const { workspace, database } = await reserveDemo(name);
  const env = { ...process.env, DATABASE_URL: `file:${database}`, STORE_MODE: "preview", DEMO_SEED_NAME: name };
  const run = (entry: string, args: string[]) => {
    const result = spawnSync(process.execPath, [entry, ...args], { env, stdio: "inherit" });
    if (result.error || result.status !== 0) throw Error("Demo initialization stopped. Existing data is unchanged; choose a NEW demo name to retry.");
  };
  const prisma = path.resolve("node_modules/prisma/build/index.js");
  const tsx = path.resolve("node_modules/tsx/dist/cli.mjs");
  run(prisma, ["generate"]);
  run(prisma, ["migrate", "deploy"]);
  run(tsx, ["prisma/seed.ts"]);
  run(tsx, ["scripts/provision-demo-accounts.ts"]);
  await writePrivate(path.join(workspace, "workspace.json"), { version: 1, status: "READY", database });
  console.log(`Isolated preview ready: ${name}. Private credentials: .local-demo/${name}/accounts.json`);
  console.log(`Start: npm run demo:dev -- ${name}. No .env, existing database or account was changed.`);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "EEXIST")
    console.error("Refusing to reuse an existing demo path. Choose a new name; nothing was reset or overwritten.");
  else console.error(error instanceof Error ? error.message : "Demo setup failed.");
  process.exitCode = 1;
}
