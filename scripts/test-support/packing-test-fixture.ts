import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
/** Extend legacy happy-path fixtures with the now mandatory physical packing attestation.
 * Dedicated acceptance tests call the raw endpoint to exercise missing/invalid checklists.
 */
export async function packPreparedFixture(
  db: PrismaClient,
  client: {
    post: (
      action: string,
      data: unknown,
    ) => Promise<{ status: number; body: unknown }>;
  },
  id: string,
) {
  if (
    !/^file:\.\/phase1-orders-[\w-]+\.db$/.test(process.env.DATABASE_URL ?? "")
  )
    throw Error("Isolated fixture only");
  const order = await db.order.findUniqueOrThrow({
    where: { id },
    include: { items: true },
  });
  if (order.packedAt) return;
  const result = await client.post("admin/order/pack", {
    id,
    eventKey: randomUUID(),
    kind: "PACK",
    reason: "Fixture kiểm tra đủ hàng trước bàn giao",
    items: order.items
      .filter((i) => i.quantity > 0)
      .map((i) => ({ id: i.id, quantity: i.quantity, checked: true })),
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
}
