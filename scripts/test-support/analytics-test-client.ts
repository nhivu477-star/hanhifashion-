import { PrismaClient } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
// Positive legacy cart scenarios now authenticate a separate local fixture buyer.
// Blank clients remain anonymous for every non-cart security assertion.
export async function authenticateCartFixture(
  db: PrismaClient,
  cookies: Map<string, string>,
) {
  if (cookies.has("hn_session")) return;
  if (
    !/^file:\.\/business-tests-[\w-]+\.db$/.test(process.env.DATABASE_URL ?? "")
  )
    throw Error("Test DB required");
  const template = await db.user.findFirstOrThrow({
    where: { role: "CUSTOMER" },
  });
  const id = randomUUID();
  const user = await db.user.create({
    data: {
      name: "QA authenticated cart",
      phone: "0900000000",
      email: id + "@analytics.test",
      passwordHash: template.passwordHash,
    },
  });
  const token = randomUUID();
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      permissionVersion: user.permissionVersion,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  cookies.set("hn_session", token);
}
