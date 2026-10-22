import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
const rl = createInterface({ input: stdin, output: stdout });
const db = new PrismaClient();
try {
  const email = process.env.ADMIN_EMAIL || (await rl.question("Admin email: "));
  const password =
    process.env.ADMIN_PASSWORD ||
    (await rl.question(
      "Development password (12+ characters, visible in terminal): ",
    ));
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12)
    throw new Error(
      "Valid email and password of at least 12 characters required",
    );
  await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "ADMIN", passwordHash: await hash(password, 12) },
    create: {
      email: email.toLowerCase(),
      name: "Quản trị HÀ NHI",
      phone: "",
      role: "ADMIN",
      passwordHash: await hash(password, 12),
    },
  });
  console.log("Local admin created. Sign in at /dang-nhap, then visit /admin.");
} finally {
  rl.close();
  await db.$disconnect();
}
