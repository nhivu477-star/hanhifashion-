import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { writePrivate } from "./demo-workspace";
const rl = createInterface({ input: stdin, output: stdout });
const db = new PrismaClient();
try {
  const email = process.env.ADMIN_EMAIL || (await rl.question("Admin email: "));
  const password = process.env.ADMIN_PASSWORD || randomBytes(24).toString("base64url");
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12)
    throw new Error(
      "Valid email and password of at least 12 characters required",
    );
  if (await db.user.findUnique({ where: { email: email.toLowerCase() } }))
    throw new Error("Account already exists. Refusing to reset its password or change its role; use audited account management.");
  if (!process.env.ADMIN_PASSWORD)
    await writePrivate(path.resolve(".local-admin-credentials.json"), { email: email.toLowerCase(), password });
  await db.user.create({
    data: {
      email: email.toLowerCase(),
      name: "Quản trị HÀ NHI",
      phone: "",
      role: "ADMIN",
      passwordHash: await hash(password, 12),
    },
  });
  console.log("Local admin created. Generated credentials, when used, are in .local-admin-credentials.json (private, git-ignored). Sign in at /dang-nhap, then visit /admin.");
} finally {
  rl.close();
  await db.$disconnect();
}
