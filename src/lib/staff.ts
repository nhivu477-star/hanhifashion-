import { hash } from "bcryptjs";
import { z } from "zod";
import { orderTransaction, OrderActor } from "./order-lifecycle";
import { requireActorPermission, operationalAudit } from "./authorization";
import { assignableRoles, isStaff } from "./rbac";
const reasonSchema = z.string().trim().min(3).max(1000);
export async function createStaff(
  input: unknown,
  actor: OrderActor,
  managedAccount = false,
) {
  const d = z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z
        .string()
        .email()
        .max(200)
        .transform((x) => x.toLowerCase()),
      password: z.string().min(12).max(128),
      role: z.enum(
        managedAccount
          ? ([...assignableRoles, "CUSTOMER"] as const)
          : assignableRoles,
      ),
      reason: reasonSchema,
    })
    .strict()
    .parse(input);
  const passwordHash = await hash(d.password, 12);
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "staff.create");
    await requireActorPermission(tx, actor, "roles.assign");
    const u = await tx.user.create({
      data: {
        name: d.name,
        email: d.email,
        phone: "",
        role: d.role,
        passwordHash,
      },
    });
    await operationalAudit(
      tx,
      actor.id,
      managedAccount ? "ACCOUNT_CREATED" : "STAFF_CREATED",
      "USER",
      u.id,
      null,
      { role: u.role, active: u.active, name: u.name },
      d.reason,
    );
    return { id: u.id };
  });
}
export async function updateStaff(
  input: unknown,
  operation: string,
  actor: OrderActor,
  managedAccount = false,
) {
  const base = { id: z.string(), reason: reasonSchema };
  const d =
    operation === "role"
      ? z
          .object({
            ...base,
            role: z.enum(
              managedAccount
                ? ([...assignableRoles, "CUSTOMER"] as const)
                : assignableRoles,
            ),
          })
          .strict()
          .parse(input)
      : operation === "status"
        ? z
            .object({ ...base, active: z.boolean() })
            .strict()
            .parse(input)
        : z
            .object({
              ...base,
              name: z.string().trim().min(2).max(100),
              email: z
                .string()
                .email()
                .max(200)
                .transform((x) => x.toLowerCase()),
            })
            .strict()
            .parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(
      tx,
      actor,
      operation === "role"
        ? "roles.assign"
        : operation === "status"
          ? "staff.disable"
          : "staff.update",
    );
    const u = await tx.user.findUniqueOrThrow({ where: { id: d.id } });
    if (!isStaff(u.role) && !(managedAccount && u.role === "CUSTOMER"))
      throw Error(
        "Không dùng quản lý nhân viên cho tài khoản khách/role không được hỗ trợ.",
      );
    if (u.id === actor.id && (operation === "role" || operation === "status"))
      throw Error("Không tự thay vai trò hoặc khóa tài khoản đang dùng.");
    if (
      u.role === "ADMIN" &&
      u.active &&
      (("active" in d && !d.active) ||
        ("role" in d && d.role !== "ADMIN")) &&
      (await tx.user.count({ where: { role: "ADMIN", active: true } })) <=
        1
    )
      throw Error("Không được loại bỏ ADMIN hoạt động cuối cùng.");
    const before = { role: u.role, active: u.active, name: u.name };
    const data =
      "role" in d
        ? { role: d.role }
        : "active" in d
          ? { active: d.active }
          : { name: d.name, email: d.email };
    const updated = await tx.user.update({
      where: { id: u.id },
      data: { ...data, permissionVersion: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: u.id } });
    await operationalAudit(
      tx,
      actor.id,
      (managedAccount ? "ACCOUNT_" : "STAFF_") + operation.toUpperCase(),
      "USER",
      u.id,
      before,
      {
        role: updated.role,
        active: updated.active,
        name: updated.name,
        permissionVersion: updated.permissionVersion,
      },
      d.reason,
    );
    return { id: u.id };
  });
}
