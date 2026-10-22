import { randomBytes } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { compare } from "bcryptjs";
import { db } from "../src/lib/db";
import { manageAccount } from "../src/lib/managed-accounts";
import { accountRole, accountTypes } from "../src/lib/account-types";
const filename = ".local-demo-accounts.json";
let existing: string | undefined;
try {
  existing = await readFile(filename, "utf8");
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
if (existing) {
  const record = JSON.parse(existing);
  for (const a of record.accounts) {
    const u = await db.user.findUniqueOrThrow({ where: { email: a.email } });
    if (
      u.role !== accountRole[a.accountType as keyof typeof accountRole] ||
      !(await compare(a.password, u.passwordHash))
    )
      throw Error(
        "Existing local demo credentials do not match; no accounts were changed.",
      );
  }
  console.log(
    "The three existing demo accounts are valid; passwords were preserved.",
  );
} else {
  const owner = await db.user.findFirstOrThrow({
    where: { role: "SUPER_ADMIN", active: true },
    orderBy: { createdAt: "asc" },
  });
  const accounts = accountTypes.map((accountType) => ({
    accountType,
    email: `${accountType.toLowerCase()}.demo@hanhi.local`,
    password: randomBytes(20).toString("base64url"),
  }));
  if (
    await db.user.count({
      where: { email: { in: accounts.map((a) => a.email) } },
    })
  )
    throw Error("Demo email already exists; refusing to overwrite an account.");
  const file = await open(filename, "wx", 0o600);
  const record = {
    mode: "LOCAL E-COMMERCE DEMO",
    login: "http://localhost:3000/dang-nhap",
    status: "CREATING",
    accounts,
  };
  try {
    // Save credentials before creating records so interrupted runs never lose new passwords.
    await file.writeFile(JSON.stringify(record, null, 2));
    await file.sync();
    for (const a of accounts)
      await manageAccount(
        {
          name: `HÀ NHI Demo ${a.accountType}`,
          ...a,
          reason:
            "Chủ dự án yêu cầu ba tài khoản demo ADMIN / SELLER / BUYER; local only.",
        },
        "create",
        { id: owner.id, role: owner.role, label: owner.email },
      );
    record.status = "READY";
    await file.truncate(0);
    await file.write(JSON.stringify(record, null, 2), 0, "utf8");
    await file.sync();
  } finally {
    await file.close();
  }
  console.log(
    "Created three local demo accounts. Credentials stored in git-ignored mode0600 file; no existing users modified.",
  );
}
await db.$disconnect();
