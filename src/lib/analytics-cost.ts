import { z } from "zod";
import { orderTransaction } from "./order-lifecycle";
import { requireActorPermission, operationalAudit } from "./authorization";
export async function saveAnalyticsCost(
  input: unknown,
  actor: { id: string; role: string },
) {
  const d = z
    .object({
      sku: z.string().trim().max(80).optional(),
      variantSku: z.string().trim().max(100).optional(),
      orderItemId: z.string().max(80).optional(),
      unitCost: z.coerce.number().int().min(0).max(100000000),
      source: z.string().trim().min(20).max(500),
    })
    .strict()
    .parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "analytics.costs.manage");
    if (d.orderItemId) {
      const item = await tx.orderItem.findUniqueOrThrow({
        where: { id: d.orderItemId },
        include: { analytics: true },
      });
      if (!item.analytics)
        throw Error(
          "Cần đối chiếu phân bổ giảm giá trước khi nhập giá vốn lịch sử.",
        );
      const before = item.analytics;
      const after = await tx.orderLineAnalytics.update({
        where: { orderItemId: item.id },
        data: {
          unitCost: d.unitCost,
          costSource: d.source,
          costCapturedAt: new Date(),
        },
      });
      await operationalAudit(
        tx,
        actor.id,
        "ANALYTICS_HISTORICAL_COST",
        "COST",
        item.id,
        before,
        after,
        "Nguồn xác minh lịch sử: " + d.source,
      );
      return after.orderItemId;
    }
    if (!d.sku) throw Error("Cần SKU sản phẩm.");
    const p = await tx.product.findUniqueOrThrow({ where: { sku: d.sku } });
    const v = d.variantSku
      ? await tx.productVariant.findUniqueOrThrow({
          where: { sku: d.variantSku },
        })
      : null;
    if (v && v.productId !== p.id)
      throw Error("SKU biến thể không thuộc sản phẩm.");
    const row = await tx.productCostHistory.create({
      data: {
        productId: p.id,
        variantId: v?.id,
        unitCost: d.unitCost,
        source: d.source,
        createdBy: actor.id,
      },
    });
    await operationalAudit(
      tx,
      actor.id,
      "ANALYTICS_COST",
      "COST",
      row.id,
      null,
      { unitCost: row.unitCost, productId: p.id, variantId: v?.id },
      d.source,
    );
    return row.id;
  });
}
