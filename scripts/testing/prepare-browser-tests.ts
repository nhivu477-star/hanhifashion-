import { execFileSync } from "node:child_process";
import { rename } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import path from "node:path";
import { reserveDemo, writePrivate } from "../demo-workspace";
const name = `browser-${randomBytes(8).toString("hex")}`;
const { database } = await reserveDemo(name);
const url = `file:${database}`;
const env = { ...process.env, DATABASE_URL: url, DEMO_SEED_NAME: name, STORE_MODE: "preview" };
execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
  env,
  stdio: "inherit",
});
execFileSync(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), "prisma/seed.ts"], { env, stdio: "inherit" });
const db = new PrismaClient({ datasources: { db: { url } } });
// Exclusively reserved, newly migrated and seeded database. Never reset or delete existing data.
const password = randomBytes(18).toString("hex");
const email = "qa-admin@hanhi.test";
await db.user.create({
  data: {
    name: "QA Admin",
    email,
    phone: "0900000000",
    passwordHash: await hash(password, 12),
    role: "ADMIN",
  },
});
const credentialFile = path.join(path.dirname(database), "browser-credentials.json");
await writePrivate(credentialFile, { email, password, database: url });
// Rename replaces a previous pointer/symlink itself; it never opens its target.
await rename(credentialFile, path.resolve(".test-credentials.json"));
await db.$disconnect();
