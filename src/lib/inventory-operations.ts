import { z } from "zod";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit, requireActorPermission } from "./authorization";
const schema = z
  .object({
    sku: z.string().trim().min(1).max(150),
    kind: z.enum(["IN", "OUT"]),
    quantity: z.coerce.number().int().min(1).max(100000),
    date: z.string().datetime({ offset: true }),
    supplier: z.string().trim().max(200).default(""),
    reason: z.string().trim().min(3).max(300),
    notes: z.string().max(1000).default(""),
    eventKey: z.string().uuid(),
  })
  .superRefine((d, ctx) => {
    if (d.kind === "IN" && !d.supplier)
      ctx.addIssue({
        code: "custom",
        path: ["supplier"],
        message: "Nhập nhà cung cấp",
      });
    if (new Date(d.date).getTime() > Date.now() + 60000)
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "Ngày không được ở tương lai",
      });
  });
export async function moveStock(input: unknown, actor: { id: string }) {
  const d = schema.parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "inventory.adjust");
    const old = await tx.inventoryMovement.findUnique({
      where: { eventKey: d.eventKey },
      include: { variant: true },
    });
    const delta = d.kind === "IN" ? d.quantity : -d.quantity;
    if (old) {
      if (
        old.actorId !== actor.id ||
        old.variant.sku !== d.sku ||
        old.delta !== delta ||
        old.reason !== d.reason ||
        old.supplier !== d.supplier ||
        old.notes !== d.notes ||
        old.occurredAt?.getTime() !== new Date(d.date).getTime()
      )
        throw Error("Mã thao tác đã được sử dụng cho nội dung khác.");
      return { id: old.id, unchanged: true };
    }
    const v = await tx.productVariant.findUniqueOrThrow({
      where: { sku: d.sku },
    });
    const changed = await tx.productVariant.updateMany({
      where: {
        id: v.id,
        stock: v.stock,
        ...(delta < 0 ? { AND: { stock: { gte: -delta } } } : {}),
      },
      data: { stock: { increment: delta } },
    });
    if (changed.count !== 1)
      throw Error("Không đủ tồn kho hoặc tồn kho vừa thay đổi.");
    const m = await tx.inventoryMovement.create({
      data: {
        variantId: v.id,
        actorId: actor.id,
        delta,
        kind: d.kind,
        occurredAt: new Date(d.date),
        supplier: d.supplier,
        reason: d.reason,
        notes: d.notes,
        eventKey: d.eventKey,
      },
    });
    await operationalAudit(
      tx,
      actor.id,
      "STOCK_" + d.kind,
      "INVENTORY",
      v.id,
      { stock: v.stock },
      { stock: v.stock + delta, movementId: m.id },
      d.reason,
    );
    return { id: m.id };
  });
}
