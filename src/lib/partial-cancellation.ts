import { z } from "zod";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit, requireActorPermission } from "./authorization";
import { mutationReceipt } from "./mutation-receipt";
import { netLineAmounts } from "./returns-rules";
import { isStaff } from "./rbac";
import { db } from "./db";
export async function partialCancellationEnabled() {
  const rule = await db.storeSetting.findUnique({
    where: { key: "business.partialCancellationPolicy" },
  });
  return rule?.value === "NET_SNAPSHOT_V1_APPROVED";
}

export const partialCancellationInput = z
  .object({
    id: z.string().min(1),
    eventKey: z.string().uuid(),
    reason: z.string().trim().min(3).max(1000),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    (d) => new Set(d.items.map((i) => i.id)).size === d.items.length,
    "Không được lặp dòng hàng.",
  );

/** Unpaid order amendment: preserve contracted unit prices, allocate existing discount, keep shipping. */
export async function cancelOrderItems(input: unknown, actor: { id: string }) {
  const d = partialCancellationInput.parse(input);
  return orderTransaction(async (tx) => {
    const policy = await tx.storeSetting.findUnique({
      where: { key: "business.partialCancellationPolicy" },
    });
    if (policy?.value !== "NET_SNAPSHOT_V1_APPROVED")
      throw Error(
        "Hủy một phần đang khóa: cần chủ cửa hàng phê duyệt chính sách tài chính trước khi sử dụng.",
      );
    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!user.active) throw Error("Tài khoản đã bị khóa.");
    const staff = isStaff(user.role);
    if (staff) await requireActorPermission(tx, actor, "orders.cancel");
    const order = await tx.order.findUniqueOrThrow({
      where: { id: d.id },
      include: {
        items: { include: { analytics: true } },
        payments: true,
        shipment: true,
      },
    });
    if (!staff && (user.role !== "CUSTOMER" || order.userId !== user.id))
      throw Error("Không có quyền xử lý đơn hàng này.");
    const receipt = await mutationReceipt(
      tx,
      "ORDER_ITEMS_CANCELLED",
      d.eventKey,
      user.id,
      d,
    );
    if (receipt.replay) return { id: order.id, unchanged: true };
    if (
      !["PENDING", "CONFIRMED"].includes(order.status) ||
      order.paymentStatus !== "UNPAID" ||
      order.shipment
    )
      throw Error(
        "Chỉ hủy một phần đơn chưa thanh toán, chưa chuẩn bị và chưa tạo hồ sơ giao nhận.",
      );
    if (
      order.payments.length !== 1 ||
      order.payments[0].method !== "COD" ||
      order.payments[0].status !== "UNPAID" ||
      order.payments[0].amount !== order.total
    )
      throw Error("Dữ liệu thanh toán chưa khớp đơn hàng.");
    const amounts = netLineAmounts(order.items, order.discount);
    const cancelled = new Map(d.items.map((i) => [i.id, i.quantity]));
    let grossRemoved = 0,
      netRemoved = 0;
    for (const i of d.items) {
      const line = order.items.find((line) => line.id === i.id);
      if (!line || i.quantity > line.quantity)
        throw Error(
          "Số lượng hủy vượt số lượng còn lại hoặc dòng không thuộc đơn.",
        );
      grossRemoved += line.unitPrice * i.quantity;
      // Use stored snapshot when present, retaining the final rounding remainder.
      const net = line.analytics?.netAmount ?? amounts[line.id];
      netRemoved +=
        i.quantity === line.quantity
          ? net
          : Number((BigInt(net) * BigInt(i.quantity)) / BigInt(line.quantity));
    }
    if (
      order.items.reduce(
        (sum, i) => sum + i.quantity - (cancelled.get(i.id) ?? 0),
        0,
      ) < 1
    )
      throw Error("Hãy dùng chức năng hủy toàn bộ đơn hàng.");
    const next = {
      subtotal: order.subtotal - grossRemoved,
      discount: order.discount - (grossRemoved - netRemoved),
      total: order.total - netRemoved,
    };
    if (
      next.discount < 0 ||
      next.total !== next.subtotal - next.discount + order.shipping
    )
      throw Error(
        "Snapshot tài chính không khớp; cần đối chiếu trước khi hủy.",
      );
    const changed = await tx.order.updateMany({
      where: {
        id: order.id,
        status: order.status,
        paymentStatus: "UNPAID",
        total: order.total,
        updatedAt: order.updatedAt,
      },
      data: next,
    });
    if (changed.count !== 1) throw Error("Đơn vừa thay đổi. Vui lòng tải lại.");
    for (const line of order.items) {
      const quantity = cancelled.get(line.id) ?? 0;
      if (!quantity) continue;
      const net = line.analytics?.netAmount ?? amounts[line.id];
      const removed =
        quantity === line.quantity
          ? net
          : Number((BigInt(net) * BigInt(quantity)) / BigInt(line.quantity));
      await tx.orderItem.update({
        where: { id: line.id },
        data: {
          originalQuantity: line.originalQuantity ?? line.quantity,
          quantity: { decrement: quantity },
        },
      });
      await tx.orderLineAnalytics.upsert({
        where: { orderItemId: line.id },
        create: { orderItemId: line.id, netAmount: net - removed },
        update: { netAmount: net - removed },
      });
      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { stock: { increment: quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: line.variantId,
          delta: quantity,
          orderId: order.id,
          actorId: user.id,
          reason: `Hủy một phần ${order.code}: ${d.reason}`,
        },
      });
    }
    await tx.payment.update({
      where: { id: order.payments[0].id },
      data: { amount: next.total },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        status: order.status,
        actorId: user.id,
        actorLabel: staff ? "Quản trị cửa hàng" : "Khách hàng",
        event: "ITEMS_CANCELLED",
        note: `Hủy ${d.items.reduce((n, i) => n + i.quantity, 0)} sản phẩm, giảm ${netRemoved.toLocaleString("vi-VN")}đ. ${d.reason}`,
      },
    });
    await operationalAudit(
      tx,
      user.id,
      "ORDER_PARTIAL_CANCELLATION",
      "ORDER",
      order.id,
      {
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        items: order.items.map((i) => ({ id: i.id, quantity: i.quantity })),
      },
      { ...next, items: d.items, eventKey: d.eventKey },
      d.reason,
    );
    await receipt.commit();
    return { id: order.id };
  });
}
