import { z } from "zod";
import { orderTransaction } from "./order-lifecycle";
import { requireActorPermission, operationalAudit } from "./authorization";
import { mutationReceipt } from "./mutation-receipt";
const createInput = z
  .object({
    eventKey: z.string().uuid(),
    reason: z.string().trim().min(3).max(1000),
    lines: z
      .array(
        z
          .object({
            sku: z.string().trim().min(1).max(150),
            countedStock: z.coerce.number().int().min(0).max(100000),
            damagedStock: z.coerce.number().int().min(0).max(100000).default(0),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export async function createStocktake(input: unknown, actor: { id: string; permissionVersion: number }) {
  const d = createInput.parse(input);
  if (new Set(d.lines.map((i) => i.sku)).size !== d.lines.length)
    throw Error("Không được lặp SKU kiểm kê.");
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "inventory.adjust");
    const receipt = await mutationReceipt(
      tx,
      "STOCKTAKE_CREATE",
      d.eventKey,
      actor.id,
      d,
    );
    if (receipt.replay) {
      const old = await tx.stocktake.findUniqueOrThrow({
        where: { eventKey: d.eventKey },
      });
      return { id: old.id, unchanged: true };
    }
    const variants = await tx.productVariant.findMany({
      where: { sku: { in: d.lines.map((l) => l.sku) } },
    });
    if (variants.length !== d.lines.length)
      throw Error("SKU kiểm kê không tồn tại.");
    const record = await tx.stocktake.create({
      data: {
        actorId: actor.id,
        eventKey: d.eventKey,
        reason: d.reason,
        lines: {
          create: d.lines.map((l) => ({
            variantId: variants.find((v) => v.sku === l.sku)!.id,
            bookStock: variants.find((v) => v.sku === l.sku)!.stock,
            countedStock: l.countedStock,
            damagedStock: l.damagedStock,
          })),
        },
      },
    });
    await operationalAudit(
      tx,
      actor.id,
      "STOCKTAKE_CREATE",
      "STOCKTAKE",
      record.id,
      null,
      d,
      d.reason,
    );
    await receipt.commit();
    return { id: record.id };
  });
}
export async function changeStocktake(input: unknown, actor: { id: string; permissionVersion: number }) {
  const d = z
    .object({
      id: z.string(),
      status: z.enum(["SUBMITTED", "APPROVED", "CANCELLED"]),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "inventory.adjust");
    const record = await tx.stocktake.findUniqueOrThrow({
      where: { id: d.id },
      include: { lines: true },
    });
    if (record.status === d.status) return { id: record.id, unchanged: true };
    const edges: Record<string, string[]> = {
      DRAFT: ["SUBMITTED", "CANCELLED"],
      SUBMITTED: ["APPROVED", "CANCELLED"],
    };
    if (!edges[record.status]?.includes(d.status))
      throw Error("Trạng thái kiểm kê không hợp lệ.");
    const claim = await tx.stocktake.updateMany({
      where: { id: record.id, status: record.status },
      data: {
        status: d.status,
        ...(d.status === "APPROVED"
          ? { approvedBy: actor.id, approvedAt: new Date() }
          : {}),
      },
    });
    if (!claim.count) throw Error("Phiếu kiểm kê vừa thay đổi.");
    if (d.status === "APPROVED")
      for (const line of record.lines) {
        const updated = await tx.productVariant.updateMany({
          where: { id: line.variantId, stock: line.bookStock },
          data: { stock: line.countedStock },
        });
        if (!updated.count)
          throw Error(
            "Tồn sổ sách đã thay đổi sau khi kiểm kê. Hãy kiểm đếm lại và tạo phiếu mới; không ghi đè giao dịch phát sinh.",
          );
        await tx.inventoryMovement.create({
          data: {
            variantId: line.variantId,
            delta: line.countedStock - line.bookStock,
            kind: "STOCKTAKE",
            actorId: actor.id,
            eventKey: `stocktake:${record.id}:${line.variantId}`,
            occurredAt: new Date(),
            reason: d.reason,
            notes: `Phiếu ${record.id}; hàng hỏng cách ly: ${line.damagedStock}, không cộng vào tồn bán được.`,
          },
        });
      }
    await operationalAudit(
      tx,
      actor.id,
      "STOCKTAKE_" + d.status,
      "STOCKTAKE",
      record.id,
      { status: record.status, lines: record.lines },
      { status: d.status },
      d.reason,
    );
    return { id: record.id };
  });
}
