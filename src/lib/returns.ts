import { actorPermission } from "./authorization";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";
import { orderTransaction, OrderActor } from "./order-lifecycle";
import { effectivePrice } from "./catalog";
import { validateShipmentTransition } from "./shipping-states";
import {
  inReturnWindow,
  returnDeadline,
  POLICY_VERSION,
  netLineAmounts,
  validateReturnTransition,
} from "./returns-rules";
type Tx = Prisma.TransactionClient;
const fingerprint = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
async function audit(
  tx: Tx,
  a: OrderActor,
  id: string,
  action: string,
  detail: unknown,
) {
  await tx.auditLog.create({
    data: {
      actorId: a.id,
      resourceType: "RETURN",
      result: "SUCCESS",
      afterJson: JSON.stringify(detail),
      targetId: id,
      action,
      detail: JSON.stringify(detail),
    },
  });
}
export async function deliveryTime(tx: Tx, orderId: string) {
  const s = await tx.shipment.findUnique({
    where: { orderId },
    select: { id: true, status: true },
  });
  if (s) {
    if (s.status !== "DELIVERED") return null;
    return (
      (
        await tx.shipmentEvent.findFirst({
          where: { shipmentId: s.id, status: "DELIVERED" },
          orderBy: { createdAt: "asc" },
        })
      )?.createdAt ?? null
    );
  }
  return (
    (
      await tx.orderStatusHistory.findFirst({
        where: { orderId, status: "DELIVERED" },
        orderBy: { createdAt: "asc" },
      })
    )?.createdAt ?? null
  );
}
export type ReturnInput = {
  orderId: string;
  eventKey: string;
  resolution: "REFUND" | "EXCHANGE";
  reason: string;
  items: { orderItemId: string; quantity: number }[];
  evidence?: { mime: string; data: string }[];
};
export async function createReturn(input: ReturnInput, actor: OrderActor) {
  if (actor.role !== "CUSTOMER")
    throw Error("Chỉ khách hàng đã đăng nhập được gửi yêu cầu.");
  const canonical = {
    ...input,
    items: [...input.items].sort((a, b) =>
      a.orderItemId.localeCompare(b.orderItemId),
    ),
  };
  const payloadHash = fingerprint(canonical);
  return orderTransaction(async (tx) => {
    const customer = await tx.user.findUnique({ where: { id: actor.id } });
    if (!customer?.active || customer.role !== "CUSTOMER")
      throw Error("Tài khoản không đủ điều kiện gửi yêu cầu đổi trả.");
    const order = await tx.order.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { items: { include: { analytics: true } } },
    });
    if (order.userId !== actor.id)
      throw Error("Không có quyền truy cập đơn hàng.");
    const prior = await tx.returnRequest.findUnique({
      where: { eventKey: input.eventKey },
    });
    if (prior) {
      if (prior.userId !== actor.id || prior.payloadHash !== payloadHash)
        throw Error("Khóa gửi yêu cầu đã được dùng với nội dung khác.");
      return prior;
    }
    if (!["DELIVERED", "COMPLETED"].includes(order.status))
      throw Error("Đơn chưa đủ điều kiện đổi trả.");
    const deliveredAt = await deliveryTime(tx, order.id);
    if (!deliveredAt)
      throw Error(
        "Thiếu mốc nhận hàng; vui lòng liên hệ cửa hàng để xác minh.",
      );
    if (!inReturnWindow(deliveredAt))
      throw Error(
        "Đã hết thời hạn 72 giờ gửi yêu cầu lỗi; vui lòng liên hệ cửa hàng để được xem xét riêng.",
      );
    if (
      !input.items.length ||
      new Set(input.items.map((i) => i.orderItemId)).size !== input.items.length
    )
      throw Error("Chọn dòng sản phẩm hợp lệ, không trùng lặp.");
    const fallbackNet = netLineAmounts(order.items, order.discount);
    const net = Object.fromEntries(
      order.items.map((i) => [
        i.id,
        i.analytics?.netAmount ?? fallbackNet[i.id],
      ]),
    );
    if (
      Object.values(net).reduce((sum, amount) => sum + amount, 0) !==
      order.subtotal - order.discount
    )
      throw Error(
        "Snapshot giảm giá chưa khớp; cần đối chiếu trước khi đổi trả.",
      );
    const lines = [];
    for (const i of input.items) {
      const purchased = order.items.find((p) => p.id === i.orderItemId);
      if (!purchased || !Number.isInteger(i.quantity) || i.quantity < 1)
        throw Error("Sản phẩm/số lượng không hợp lệ.");
      const used = await tx.returnItem.findMany({
        where: { orderItemId: i.orderItemId, request: { released: false } },
      });
      const quantity = used.reduce((s, x) => s + x.quantity, 0),
        amount = used.reduce((s, x) => s + x.amount, 0);
      if (i.quantity > purchased.quantity - quantity)
        throw Error(
          "Số lượng vượt phần còn được yêu cầu hoặc đã có hồ sơ đang xử lý.",
        );
      lines.push({
        orderItemId: i.orderItemId,
        quantity: i.quantity,
        amount:
          i.quantity === purchased.quantity - quantity
            ? net[purchased.id] - amount
            : Math.floor((net[purchased.id] * i.quantity) / purchased.quantity),
      });
    }
    const r = await tx.returnRequest.create({
      data: {
        reference: `HN-RETURN-${randomUUID().toUpperCase()}`,
        eventKey: input.eventKey,
        payloadHash,
        orderId: order.id,
        userId: actor.id,
        resolution: input.resolution,
        reason: input.reason,
        policyVersion: POLICY_VERSION,
        deliveredAt,
        deadline: returnDeadline(deliveredAt),
        items: { create: lines },
        evidence: { create: input.evidence ?? [] },
        history: {
          create: {
            status: "REQUESTED",
            actorId: actor.id,
            reason: input.reason,
          },
        },
      },
    });
    await tx.inquiry.create({
      data: {
        userId: customer.id, name: customer.name, email: customer.email, phone: customer.phone,
        subject: `Đổi trả đơn ${order.code}`,
        message: `Khách gửi yêu cầu ${input.resolution === "REFUND" ? "hoàn tiền" : "đổi sản phẩm"} cho đơn ${order.code}.\nMã yêu cầu: ${r.reference}\nLý do: ${input.reason}`,
        status: "NEW",
      },
    });
    await audit(tx, actor, r.id, "RETURN_REQUESTED", {
      orderId: order.id,
      items: lines.map((i) => ({
        orderItemId: i.orderItemId,
        quantity: i.quantity,
      })),
    });
    return r;
  });
}
async function load(tx: Tx, id: string) {
  return tx.returnRequest.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { orderItem: true, exchange: true } },
      order: { include: { items: true, payments: true, shipment: true } },
      refund: true,
    },
  });
}
async function transition(
  tx: Tx,
  r: Awaited<ReturnType<typeof load>>,
  to: string,
  reason: string,
  a: OrderActor,
) {
  validateReturnTransition(r.status, to);
  const claim = await tx.returnRequest.updateMany({
    where: { id: r.id, version: r.version },
    data: {
      status: to,
      version: { increment: 1 },
      ...(to === "REJECTED" ? { released: true } : {}),
    },
  });
  if (!claim.count) throw Error("Hồ sơ vừa thay đổi, vui lòng tải lại.");
  await tx.returnHistory.create({
    data: {
      requestId: r.id,
      previousStatus: r.status,
      status: to,
      actorId: a.id,
      reason,
    },
  });
  await audit(tx, a, r.id, "RETURN_" + to, {
    orderId: r.orderId,
    from: r.status,
    to,
    reason,
  });
}
export async function changeReturn(
  id: string,
  to: string,
  reason: string,
  a: OrderActor,
) {
  await actorPermission(
    a,
    to === "RECEIVED" ? "returns.inspect" : "returns.review",
  );
  return orderTransaction(async (tx) => {
    const r = await load(tx, id);
    if (r.status === to) return r;
    if (to === "CLOSED" && r.status === "REFUND_PENDING")
      throw new Error(
        "Phải từ chối/hủy khoản hoàn bằng thao tác hoàn tiền trước khi đóng hồ sơ.",
      );
    if (
      !["UNDER_REVIEW", "APPROVED", "REJECTED", "RECEIVED", "CLOSED"].includes(
        to,
      )
    )
      throw Error("Dùng thao tác kiểm hàng/đổi/hoàn tương ứng.");
    if (
      to === "CLOSED" &&
      r.items.some(
        (i) =>
          i.exchange && !["RETURNED", "CANCELED"].includes(i.exchange.status),
      )
    )
      throw Error("Kiện thay thế chưa kết thúc an toàn.");
    await transition(tx, r, to, reason, a);
    return { id };
  });
}
export async function inspectReturn(
  id: string,
  itemId: string,
  condition: string,
  notes: string,
  evidence: string,
  a: OrderActor,
) {
  await actorPermission(a, "returns.inspect");
  if (condition === "SELLABLE") await actorPermission(a, "inventory.adjust");
  return orderTransaction(async (tx) => {
    const r = await load(tx, id),
      i = r.items.find((i) => i.id === itemId);
    if (!i) throw Error("Dòng hàng không thuộc hồ sơ.");
    if (i.disposition && i.disposition !== "REVIEW") {
      const prior = await tx.returnInspection.findFirst({
        where: { itemId },
        orderBy: { createdAt: "desc" },
      });
      if (
        prior?.condition === condition &&
        prior.notes === notes &&
        prior.evidence === evidence
      )
        return { id, unchanged: true };
      throw Error("Kết quả kiểm hàng đã được ghi nhận; không ghi đè lịch sử.");
    }
    if (r.status !== "RECEIVED")
      throw Error("Phải nhận hàng trước khi kiểm tra.");
    if (!["SELLABLE", "DAMAGED", "REJECTED", "REVIEW"].includes(condition))
      throw Error("Kết quả kiểm hàng không hợp lệ.");
    await tx.returnInspection.create({
      data: { itemId, actorId: a.id, condition, notes, evidence },
    });
    await tx.returnItem.update({
      where: { id: itemId },
      data: { disposition: condition, restocked: condition === "SELLABLE" },
    });
    if (condition === "SELLABLE") {
      await tx.productVariant.update({
        where: { id: i.orderItem.variantId },
        data: { stock: { increment: i.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: i.orderItem.variantId,
          orderId: r.orderId,
          actorId: a.id,
          delta: i.quantity,
          reason: `RETURN_RESTOCK:${i.id}`,
        },
      });
    }
    await audit(tx, a, id, "RETURN_INSPECTED", {
      itemId,
      condition,
      notes,
      evidence,
    });
    const updated = await load(tx, id);
    if (updated.items.every((i) => i.disposition && i.disposition !== "REVIEW"))
      await transition(
        tx,
        updated,
        updated.items.some((i) => i.disposition === "REJECTED")
          ? "INSPECTION_FAILED"
          : "INSPECTED",
        notes,
        a,
      );
    return { id };
  });
}
export async function allocateExchange(
  id: string,
  replacements: { itemId: string; variantId: string }[],
  reason: string,
  a: OrderActor,
) {
  await actorPermission(a, "returns.exchange");
  return orderTransaction(async (tx) => {
    const r = await load(tx, id);
    if (r.resolution !== "EXCHANGE")
      throw Error("Khách chưa chọn phương án đổi hàng.");
    if (r.status === "EXCHANGE_PENDING" || r.status === "COMPLETED") {
      if (
        replacements.length === r.items.length &&
        r.items.every((i) =>
          replacements.some(
            (x) => x.itemId === i.id && x.variantId === i.exchange?.variantId,
          ),
        )
      )
        return { id, unchanged: true };
      throw Error("Đã phân bổ hàng thay thế khác.");
    }
    if (
      r.status !== "INSPECTED" ||
      r.items.some(
        (i) => !["SELLABLE", "DAMAGED"].includes(i.disposition ?? ""),
      )
    )
      throw Error("Cần duyệt, nhận và kiểm hàng đạt trước khi đổi.");
    if (
      replacements.length !== r.items.length ||
      new Set(replacements.map((x) => x.itemId)).size !== r.items.length
    )
      throw Error("Chọn đủ SKU thay thế cho mỗi dòng.");
    for (const i of r.items) {
      const chosen = replacements.find((x) => x.itemId === i.id);
      if (!chosen) throw Error("Thiếu dòng thay thế.");
      const v = await tx.productVariant.findUniqueOrThrow({
        where: { id: chosen.variantId },
        include: { product: true, colorRecord: true },
      });
      if (!v.product.active || (v.colorRecord && !v.colorRecord.active))
        throw Error("SKU thay thế không còn hoạt động.");
      const price = v.priceOverride ?? effectivePrice(v.product);
      if (price !== i.orderItem.unitPrice)
        throw Error(
          "Chưa có chính sách chênh lệch giá; chỉ đổi SKU cùng đơn giá lịch sử.",
        );
      const stock = await tx.productVariant.updateMany({
        where: { id: v.id, stock: { gte: i.quantity } },
        data: { stock: { decrement: i.quantity } },
      });
      if (stock.count !== 1) throw Error("SKU thay thế không đủ tồn kho.");
      const e = await tx.exchangeItem.create({
        data: {
          itemId: i.id,
          variantId: v.id,
          sku: v.sku,
          name: v.product.name,
          size: v.size,
          color: v.color,
          quantity: i.quantity,
          unitPrice: price,
          reference: `HN-EXCHANGE-${randomUUID().toUpperCase()}`,
          createdBy: a.id,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: v.id,
          orderId: r.orderId,
          actorId: a.id,
          delta: -i.quantity,
          reason: `EXCHANGE_ALLOCATED:${e.id}`,
        },
      });
    }
    await transition(tx, r, "EXCHANGE_PENDING", reason, a);
    return { id };
  });
}
export async function exchangeStatus(
  id: string,
  exchangeId: string,
  status: string,
  reason: string,
  a: OrderActor,
) {
  await actorPermission(a, "returns.exchange");
  await actorPermission(a, "shipping.update");
  if (["DELIVERY_FAILED", "RETURNING", "RETURNED"].includes(status))
    await actorPermission(a, "shipping.failures.manage");
  return orderTransaction(async (tx) => {
    const r = await load(tx, id),
      i = r.items.find((i) => i.exchange?.id === exchangeId),
      e = i?.exchange;
    if (!e) throw Error("Kiện không thuộc hồ sơ.");
    if (e.status === status) return { id, unchanged: true };
    if (r.status !== "EXCHANGE_PENDING")
      throw Error("Hồ sơ không đang đổi hàng.");
    validateShipmentTransition(e.status, status);
    await tx.exchangeItem.update({
      where: { id: e.id },
      data: {
        status,
        ...(status === "CANCELED" ? { stockRestored: true } : {}),
      },
    });
    if (status === "CANCELED" && !e.stockRestored) {
      await tx.productVariant.update({
        where: { id: e.variantId },
        data: { stock: { increment: e.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: e.variantId,
          orderId: r.orderId,
          actorId: a.id,
          delta: e.quantity,
          reason: `EXCHANGE_CANCELED:${e.id}`,
        },
      });
    }
    await tx.returnHistory.create({
      data: {
        requestId: id,
        previousStatus: r.status,
        status: r.status,
        actorId: a.id,
        reason: `${e.reference}: ${e.status} → ${status}. ${reason}`,
      },
    });
    await audit(tx, a, id, "EXCHANGE_SHIPPING", { exchangeId, status, reason });
    const after = await load(tx, id);
    if (after.items.every((i) => i.exchange?.status === "DELIVERED"))
      await transition(tx, after, "COMPLETED", "Đã giao đủ hàng thay thế", a);
    return { id };
  });
}
async function refundLimit(
  tx: Tx,
  r: Awaited<ReturnType<typeof load>>,
  exclude?: string,
) {
  if (r.order.payments.length !== 1)
    throw Error("Cần xác minh bản ghi thanh toán gốc.");
  const p = r.order.payments[0];
  const collected = r.order.shipment
    ? r.order.shipment.collectedCOD
    : p.status === "PAID"
      ? p.amount
      : 0;
  const prior = await tx.mockRefund.aggregate({
    where: {
      orderId: r.orderId,
      status: { in: ["PENDING", "APPROVED", "SIMULATED_COMPLETED"] },
      ...(exclude ? { id: { not: exclude } } : {}),
    },
    _sum: { amount: true },
  });
  return {
    payment: p,
    remaining: Math.min(collected, p.amount) - (prior._sum.amount ?? 0),
  };
}
export async function prepareRefund(
  id: string,
  shipping: boolean,
  reason: string,
  a: OrderActor,
) {
  await actorPermission(a, "refunds.approve");
  return orderTransaction(async (tx) => {
    const r = await load(tx, id);
    if (r.refund) {
      if (r.refund.shippingAmount !== (shipping ? r.order.shipping : 0))
        throw Error("Hồ sơ hoàn đã có phương án khác.");
      return { id, refundId: r.refund.id };
    }
    if (
      r.status !== "INSPECTED" ||
      r.resolution !== "REFUND" ||
      r.items.some(
        (i) => !["SELLABLE", "DAMAGED"].includes(i.disposition ?? ""),
      )
    )
      throw Error("Cần duyệt, nhận và kiểm hàng đạt cho phương án hoàn tiền.");
    const all = r.order.items.every((x) =>
      r.items.some((i) => i.orderItemId === x.id && i.quantity === x.quantity),
    );
    if (shipping && !all)
      throw Error(
        "Hoàn phí giao ban đầu chỉ hỗ trợ khi trả toàn bộ đơn do lỗi đã xác nhận.",
      );
    const shippingAmount = shipping ? r.order.shipping : 0;
    const amount = r.items.reduce((s, i) => s + i.amount, 0) + shippingAmount;
    const limit = await refundLimit(tx, r);
    if (amount <= 0 || amount > limit.remaining)
      throw Error("Số hoàn vượt khoản đã thu còn có thể hoàn.");
    const refund = await tx.mockRefund.create({
      data: {
        reference: `HN-REFUND-${randomUUID().toUpperCase()}`,
        requestId: id,
        orderId: r.orderId,
        paymentId: limit.payment.id,
        amount,
        shippingAmount,
        reason,
      },
    });
    await transition(tx, r, "REFUND_PENDING", reason, a);
    await audit(tx, a, id, "MOCK_REFUND_PREPARED", {
      refundId: refund.id,
      amount,
    });
    return { id, refundId: refund.id };
  });
}
export async function changeRefund(
  id: string,
  to: string,
  reason: string,
  a: OrderActor,
) {
  await actorPermission(
    a,
    to === "SIMULATED_COMPLETED" ? "refunds.execute" : "refunds.approve",
  );
  return orderTransaction(async (tx) => {
    const r = await load(tx, id),
      refund = r.refund;
    if (!refund) throw Error("Chưa có khoản hoàn.");
    if (refund.status === to) return { id, unchanged: true };
    const edges: Record<string, string[]> = {
      PENDING: ["APPROVED", "REJECTED", "CANCELED"],
      APPROVED: ["SIMULATED_COMPLETED", "CANCELED"],
    };
    if (!edges[refund.status]?.includes(to))
      throw Error("Trạng thái hoàn tiền không hợp lệ.");
    if (["APPROVED", "SIMULATED_COMPLETED"].includes(to)) {
      const limit = await refundLimit(tx, r, refund.id);
      if (refund.amount > limit.remaining)
        throw Error("Khoản đã thu không còn đủ để hoàn.");
    }
    await tx.mockRefund.update({
      where: { id: refund.id },
      data: {
        status: to,
        ...(to === "APPROVED" ? { approvalActor: a.id } : {}),
        ...(to === "SIMULATED_COMPLETED"
          ? { completionActor: a.id, completedAt: new Date() }
          : {}),
      },
    });
    await audit(tx, a, id, "MOCK_REFUND_" + to, {
      refundId: refund.id,
      amount: refund.amount,
      reason,
    });
    await tx.returnHistory.create({
      data: {
        requestId: id,
        previousStatus: r.status,
        status: r.status,
        actorId: a.id,
        reason: `SIMULATED REFUND: ${to}. ${reason}`,
      },
    });
    if (to === "SIMULATED_COMPLETED")
      await transition(
        tx,
        r,
        "COMPLETED",
        "Hoàn tiền đã hoàn tất; không chuyển tiền thật",
        a,
      );
    if (["REJECTED", "CANCELED"].includes(to))
      await transition(tx, r, "CLOSED", reason, a);
    return { id };
  });
}
export const customerReturnSelect = {
  id: true,
  reference: true,
  status: true,
  resolution: true,
  reason: true,
  createdAt: true,
  deadline: true,
  items: {
    select: {
      id: true,
      quantity: true,
      orderItem: { select: { name: true, color: true, size: true } },
      exchange: {
        select: {
          reference: true,
          name: true,
          sku: true,
          size: true,
          color: true,
          quantity: true,
          status: true,
        },
      },
    },
  },
  refund: {
    select: {
      reference: true,
      amount: true,
      shippingAmount: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  },
  history: {
    select: {
      id: true,
      status: true,
      previousStatus: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.ReturnRequestSelect;
export async function customerReturns(orderId: string, userId: string) {
  return db.returnRequest.findMany({
    where: { orderId, userId },
    select: customerReturnSelect,
    orderBy: { createdAt: "desc" },
  });
}
