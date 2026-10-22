import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { assertRolePermission, Permission, AuthorizationError } from "./rbac";
export async function requireActorPermission(
  client: Prisma.TransactionClient | PrismaClient,
  actor: { id: string },
  p: Permission,
) {
  const user = await client.user.findUnique({ where: { id: actor.id } });
  if (!user?.active) throw new AuthorizationError(p);
  assertRolePermission(user.role, p);
  return user;
}
export async function actorPermission(actor: { id: string }, p: Permission) {
  return requireActorPermission(db, actor, p);
}
export function safeAuditValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value !== "object")
    return typeof value === "string" ? value.slice(0, 3000) : value;
  if (Array.isArray(value)) return value.slice(0, 100).map(safeAuditValue);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        ([k]) =>
          !/password|token|secret|credential|accessToken|^data$|^evidence$|^email$|^phone$|^street$|^address$/i.test(
            k,
          ),
      )
      .map(([k, v]) => [k, safeAuditValue(v)]),
  );
}
export async function operationalAudit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  resourceType: string,
  targetId: string,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  await tx.auditLog.create({
    data: {
      actorId,
      action,
      resourceType,
      targetId,
      result: "SUCCESS",
      beforeJson: JSON.stringify(safeAuditValue(before)),
      afterJson: JSON.stringify(safeAuditValue(after)),
      reason,
      detail: JSON.stringify({
        before: safeAuditValue(before),
        after: safeAuditValue(after),
        reason,
      }),
    },
  });
}
