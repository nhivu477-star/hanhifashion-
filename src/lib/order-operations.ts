import { z } from "zod";
import { orderTransaction } from "./order-lifecycle";
import { requireActorPermission, operationalAudit } from "./authorization";
import { mutationReceipt } from "./mutation-receipt";
import { can } from "./rbac";
export async function packOrder(input: unknown, actor: { id: string }) {
  const d = z
    .object({
      id: z.string(),
      eventKey: z.string().uuid(),
      kind: z.enum(["PACK", "HOLD"]),
      reason: z.string().trim().min(3).max(1000),
      items: z
        .array(
          z
            .object({
              id: z.string(),
              quantity: z.number().int().min(1),
              checked: z.literal(true),
            })
            .strict(),
        )
        .default([]),
    })
    .strict()
    .parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "orders.manage");
    const order = await tx.order.findUniqueOrThrow({
      where: { id: d.id },
      include: { items: true, shipment: true },
    });
    const receipt = await mutationReceipt(
      tx,
      "ORDER_PACKING",
      d.eventKey,
      actor.id,
      d,
    );
    if (receipt.replay) return { id: order.id, unchanged: true };
    if (
      order.status !== "PROCESSING" ||
      order.shipment ||
      order.paymentStatus !== "UNPAID"
    )
      throw Error(
        "Chỉ kiểm tra đóng gói đơn đang chuẩn bị, chưa bàn giao và chưa thanh toán.",
      );
    if (order.packedAt) throw Error("Đơn đã xác nhận đóng gói.");
    if (
      d.kind === "PACK" &&
      (d.items.length !== order.items.filter((i) => i.quantity > 0).length ||
        new Set(d.items.map((i) => i.id)).size !== d.items.length ||
        d.items.some(
          (i) =>
            !order.items.some(
              (line) => line.id === i.id && line.quantity === i.quantity,
            ),
        ))
    )
      throw Error(
        "Cần kiểm tra đúng SKU, màu, size và đủ số lượng của mọi dòng đơn.",
      );
    const data =
      d.kind === "PACK"
        ? { packedAt: new Date(), packedBy: actor.id, packingHoldReason: null }
        : { packingHoldReason: d.reason };
    const claim = await tx.order.updateMany({
      where: {
        id: order.id,
        status: "PROCESSING",
        updatedAt: order.updatedAt,
        packedAt: null,
      },
      data,
    });
    if (!claim.count) throw Error("Đơn vừa thay đổi, vui lòng tải lại.");
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        previousStatus: order.status,
        event: d.kind === "PACK" ? "PACKED" : "PACKING_HELD",
        actorId: actor.id,
        actorLabel: "Nhân viên cửa hàng",
        note: d.reason,
      },
    });
    await operationalAudit(
      tx,
      actor.id,
      d.kind === "PACK" ? "ORDER_PACKED" : "ORDER_PACKING_HELD",
      "ORDER",
      order.id,
      { packedAt: null, hold: order.packingHoldReason },
      { ...data, checkedItems: d.items },
      d.reason,
    );
    await receipt.commit();
    return { id: order.id };
  });
}
export async function assignOrder(input: unknown, actor: { id: string }) {
  const d = z
    .object({
      id: z.string(),
      assignedTo: z.string().default(""),
      priority: z.enum(["NORMAL", "HIGH"]),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "orders.manage");
    const order = await tx.order.findUniqueOrThrow({ where: { id: d.id } });
    if (["COMPLETED", "CANCELLED"].includes(order.status))
      throw Error("Đơn đã kết thúc xử lý.");
    if (d.assignedTo) {
      const assigned = await tx.user.findUnique({
        where: { id: d.assignedTo },
      });
      if (!assigned?.active || !can(assigned.role, "orders.manage"))
        throw Error("Nhân viên được giao không có quyền xử lý đơn.");
    }
    const changed = await tx.order.updateMany({
      where: { id: order.id, updatedAt: order.updatedAt },
      data: { assignedTo: d.assignedTo || null, priority: d.priority },
    });
    if (!changed.count) throw Error("Đơn vừa được người khác cập nhật.");
    await operationalAudit(
      tx,
      actor.id,
      "ORDER_ASSIGNED",
      "ORDER",
      order.id,
      { assignedTo: order.assignedTo, priority: order.priority },
      d,
      d.reason,
    );
    return { id: order.id };
  });
}
