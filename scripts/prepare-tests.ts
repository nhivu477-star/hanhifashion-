import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const url = `file:./test-${randomBytes(8).toString("hex")}.db`;
const env = { ...process.env, DATABASE_URL: url };
writeFileSync(`prisma/${url.slice("file:./".length)}`, "", {
  flag: "wx",
  mode: 0o600,
});
execFileSync("npx", ["prisma", "migrate", "deploy"], {
  env,
  stdio: "inherit",
});
execFileSync("npx", ["prisma", "db", "seed"], { env, stdio: "inherit" });
const db = new PrismaClient({ datasources: { db: { url } } });
// Dedicated test database only. Keep the user's local development database intact.
await db.couponRedemption.deleteMany();
await db.orderStatusHistory.deleteMany();
await db.payment.deleteMany();
await db.orderItem.deleteMany();
await db.order.deleteMany();
await db.inventoryMovement.deleteMany();
await db.cartItem.deleteMany();
await db.cart.deleteMany();
await db.wishlistItem.deleteMany();
await db.wishlist.deleteMany();
await db.address.deleteMany();
await db.session.deleteMany();
await db.user.deleteMany();
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
writeFileSync(
  ".test-credentials.json",
  JSON.stringify({ email, password, database: url }),
  { mode: 0o600 },
);
await db.$disconnect();
