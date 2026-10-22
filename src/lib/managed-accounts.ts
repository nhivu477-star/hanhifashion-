import { z } from "zod";
import { actorPermission } from "./authorization";
import { accountRole, accountTypes } from "./account-types";
import { createStaff, updateStaff } from "./staff";
import { OrderActor } from "./order-lifecycle";
const identity = {
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .email()
    .max(200)
    .transform((s) => s.toLowerCase()),
};
const reason = z.string().trim().min(3).max(1000);
export async function manageAccount(
  input: unknown,
  operation: string,
  actor: OrderActor,
) {
  await actorPermission(actor, "accounts.manage");
  if (operation === "create") {
    const d = z
      .object({
        ...identity,
        password: z.string().min(12).max(128),
        accountType: z.enum(accountTypes),
        reason,
      })
      .strict()
      .parse(input);
    const { accountType, ...rest } = d;
    return createStaff(
      { ...rest, role: accountRole[accountType] },
      actor,
      true,
    );
  }
  const base = { id: z.string().min(1), reason };
  if (operation === "type") {
    const d = z
      .object({ ...base, accountType: z.enum(accountTypes) })
      .strict()
      .parse(input);
    return updateStaff(
      { id: d.id, role: accountRole[d.accountType], reason: d.reason },
      "role",
      actor,
      true,
    );
  }
  if (operation === "status") {
    const d = z
      .object({ ...base, active: z.boolean() })
      .strict()
      .parse(input);
    return updateStaff(d, "status", actor, true);
  }
  if (operation === "update") {
    const d = z
      .object({ ...base, ...identity })
      .strict()
      .parse(input);
    return updateStaff(d, "update", actor, true);
  }
  throw Error("Thao tác quản lý tài khoản không hợp lệ.");
}
