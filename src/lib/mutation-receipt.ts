import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

/** Business idempotency must work even when optional analytics is disabled. */
export function requestFingerprint(input: unknown): string {
  const stable = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, stable(v)]),
      );
    return value;
  };
  return createHash("sha256")
    .update(JSON.stringify(stable(input)))
    .digest("hex");
}
export async function mutationReceipt(
  tx: Prisma.TransactionClient,
  scope: string,
  key: string,
  actorId: string,
  input: unknown,
) {
  const id = "receipt:" + requestFingerprint({ scope, key, actorId });
  const hash = requestFingerprint(input);
  const old = await tx.auditLog.findUnique({ where: { id } });
  if (old && old.detail !== hash)
    throw Error("Mã thao tác đã được sử dụng cho nội dung khác.");
  return {
    replay: !!old,
    commit: () =>
      tx.auditLog.create({
        data: {
          id,
          actorId,
          action: scope,
          resourceType: "MUTATION_RECEIPT",
          targetId: key,
          result: "SUCCESS",
          detail: hash,
        },
      }),
  };
}
