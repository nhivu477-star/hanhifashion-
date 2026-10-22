import { requireActorPermission } from "./authorization";
import { isStaff } from "./rbac";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { transitions } from "./catalog";

export type OrderActor = {
  id: string;
  label: string;
  role: string;
  accessToken?: string;
};
export function validateOrderTransition(
  from: string,
  to: string,
  payment: string,
) {
  if (!transitions[from]?.includes(to))
    throw new Error("Không thể chuyển sang trạng thái này.");
  if (to === "CANCELLED" && payment !== "UNPAID")
    throw new Error(
      "Chỉ hủy đơn chưa thanh toán; khoản đã thu cần quy trình hoàn tiền riêng.",
    );
}
export const canCustomerCancel = (status: string, payment: string) =>
  ["PENDING", "CONFIRMED"].includes(status) && payment === "UNPAID";
export const shippingLabels: Record<string, string> = {
  NOT_DISPATCHED: "Chưa bàn giao",
  IN_TRANSIT: "Đã bàn giao giao hàng",
  DELIVERED: "Đã giao thành công",
  FAILED: "Giao không thành công",
  RETURNED: "Hàng đã quay về",
};
const shippingFor: Record<string, string> = {
  SHIPPING: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  DELIVERY_FAILED: "FAILED",
  RETURNED: "RETURNED",
};

// Retry only rolled-back transactions. CAS prevents duplicate financial/stock effects.
export async function orderTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, { timeout: 15000, maxWait: 15000 });
    } catch (e) {
      if (
        attempt >= 3 ||
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P2034", "P2028", "P1008", "P2002"].includes(e.code)
      )
        throw e;
      await new Promise((resolve) => {
        setTimeout(resolve, 30 * (attempt + 1));
      });
    }
  }
}
export type OrderChange = {
  id: string;
  status?: string;
  paid?: boolean;
  reason?: string;
  reference?: string;
};
export async function changeOrderInTransaction(
  tx: Prisma.TransactionClient,
  input: OrderChange,
  actor: OrderActor,
  fromShipment = false,
) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: input.id },
    include: { items: true, payments: true },
  });
  const trusted = await tx.user.findUnique({ where: { id: actor.id } });
  const admin = !!trusted?.active && isStaff(trusted.role);
  if (admin && !fromShipment) {
    if (input.paid)
      await requireActorPermission(tx, actor, "cod.collection.confirm");
    if (input.status && !input.paid)
      await requireActorPermission(
        tx,
        actor,
        input.status === "CANCELLED" ? "orders.cancel" : "orders.manage",
      );
  }
  const owner =
    (trusted?.active &&
      trusted.role === "CUSTOMER" &&
      actor.id === order.userId) ||
    (!!actor.accessToken && actor.accessToken === order.accessToken);
  if (!admin && !owner)
    throw new Error("Bạn không có quyền truy cập đơn hàng này.");
  // A completed cancellation is a no-op even if its shipment has since synced
  // with the carrier; retries must not reapply stock or require another cancel.
  if (
    !input.paid &&
    input.status === "CANCELLED" &&
    order.status === "CANCELLED"
  )
    return { id: order.id, unchanged: true };
  const shipment = await tx.shipment.findUnique({
    where: { orderId: order.id },
  });
  if (
    shipment &&
    !fromShipment &&
    (input.paid ||
      ["SHIPPING", "DELIVERED", "DELIVERY_FAILED", "RETURNED"].includes(
        input.status ?? "",
      ))
  )
    throw new Error(
      "Đơn đã có hồ sơ giao nhận. Vui lòng cập nhật tại mục Vận chuyển & COD.",
    );
  if (
    shipment?.provider === "GHN_STAGING" &&
    input.status === "CANCELLED" &&
    !fromShipment &&
    shipment.status !== "RETURNED" &&
    shipment.providerSyncStatus !== "NOT_SUBMITTED"
  )
    throw new Error("Cần xác nhận hủy từ GHN trước khi hoàn tồn.");
  if (
    shipment &&
    input.status === "CANCELLED" &&
    shipment.status !== "CANCELED" &&
    shipment.status !== "RETURNED"
  ) {
    if (!["PENDING", "READY_FOR_PICKUP"].includes(shipment.status))
      throw new Error("Kiện chưa quay về cửa hàng, không được hoàn tồn.");
    const updated = await tx.shipment.updateMany({
      where: { id: shipment.id, version: shipment.version },
      data: { status: "CANCELED", version: { increment: 1 } },
    });
    if (!updated.count) throw new Error("Kiện vừa thay đổi.");
    await tx.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        previousStatus: shipment.status,
        status: "CANCELED",
        actorId: actor.id,
        reason: input.reason,
      },
    });
  }
  const reason = input.reason?.trim() ?? "";
  const reference = input.reference?.trim() ?? "";
  if (input.paid) {
    if (!admin) throw new Error("Bạn không có quyền xác nhận thanh toán.");
    if (!["DELIVERED", "COMPLETED"].includes(order.status))
      throw new Error("Chỉ ghi nhận tiền COD sau khi giao thành công.");
    if (order.paymentStatus === "PAID")
      return { id: order.id, unchanged: true };
    if (reason.length < 3 || reference.length < 3)
      throw new Error("Cần ghi nguồn thu/đối soát và mã chứng từ COD.");
    if (
      order.paymentStatus !== "UNPAID" ||
      order.payments.length !== 1 ||
      order.payments[0].method !== "COD" ||
      order.payments[0].status !== "UNPAID" ||
      order.payments[0].amount !== order.total
    )
      throw new Error(
        "Dữ liệu thanh toán cần được đối chiếu trước khi xác nhận.",
      );
    const claim = await tx.order.updateMany({
      where: { id: order.id, status: order.status, paymentStatus: "UNPAID" },
      data: { paymentStatus: "PAID" },
    });
    if (claim.count !== 1)
      throw new Error("Đơn vừa thay đổi. Vui lòng tải lại.");
    await tx.payment.update({
      where: { id: order.payments[0].id },
      data: {
        status: "PAID",
        collectedAt: new Date(),
        collectedBy: actor.id,
        collectionReference: reference,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        status: order.status,
        actorId: actor.id,
        actorLabel: admin ? "Quản trị cửa hàng" : actor.label,
        event: "COD_COLLECTED",
        note: `${reason} · Chứng từ: ${reference}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "COD_COLLECTED",
        resourceType: "PAYMENT",
        result: "SUCCESS",
        targetId: order.id,
        detail: JSON.stringify({
          amount: order.total,
          currency: "VND",
          reference,
          reason,
        }),
      },
    });
    return { id: order.id };
  }
  const status = input.status ?? "";
  if (!admin && status !== "CANCELLED")
    throw new Error("Khách hàng chỉ được yêu cầu hủy đơn đủ điều kiện.");
  if (!admin && !canCustomerCancel(order.status, order.paymentStatus))
    throw new Error(
      "Đơn không còn đủ điều kiện tự hủy. Vui lòng liên hệ cửa hàng.",
    );
  validateOrderTransition(order.status, status, order.paymentStatus);
  if (status === "SHIPPING" && (order.packingHoldReason || !order.packedAt))
    throw Error("Cần xác nhận kiểm tra đóng gói trước khi bàn giao.");
  if (
    [
      "CANCELLED",
      "SHIPPING",
      "DELIVERED",
      "DELIVERY_FAILED",
      "RETURNED",
    ].includes(status) &&
    reason.length < 3
  )
    throw new Error("Cần nhập lý do hoặc ghi nhận giao nhận thủ công.");
  const changed = await tx.order.updateMany({
    where: {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
    },
    data: {
      status,
      ...(shippingFor[status] ? { shippingStatus: shippingFor[status] } : {}),
      ...(status === "SHIPPING"
        ? { shippingReference: reference || null }
        : {}),
    },
  });
  if (changed.count !== 1)
    throw new Error("Đơn vừa thay đổi. Vui lòng tải lại.");
  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      previousStatus: order.status,
      status,
      actorId: actor.id,
      actorLabel: admin ? "Quản trị cửa hàng" : actor.label,
      event: "STATUS_CHANGE",
      note: `${shippingFor[status] ? "Ghi nhận giao nhận thủ công. " : ""}${reason || "Cập nhật trạng thái đơn hàng"}${reference ? ` · Tham chiếu: ${reference}` : ""}`,
    },
  });
  if (status === "CANCELLED") {
    for (const item of order.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          delta: item.quantity,
          reason: `Hủy đơn ${order.code}: ${reason}`,
          orderId: order.id,
          actorId: actor.id,
        },
      });
    }
    const redemption = await tx.couponRedemption.findUnique({
      where: { orderId: order.id },
    });
    if (redemption)
      await tx.coupon.updateMany({
        where: { id: redemption.couponId, used: { gt: 0 } },
        data: { used: { decrement: 1 } },
      });
  }
  await tx.auditLog.create({
    data: {
      actorId: actor.id,
      action: "ORDER_STATUS",
      resourceType: "ORDER",
      result: "SUCCESS",
      beforeJson: JSON.stringify({ status: order.status }),
      afterJson: JSON.stringify({ status }),
      reason,
      targetId: order.id,
      detail: JSON.stringify({
        from: order.status,
        to: status,
        reason,
        reference,
        manual: !!shippingFor[status],
      }),
    },
  });
  return { id: order.id };
}
export async function changeOrder(input: OrderChange, actor: OrderActor) {
  return orderTransaction((tx) => changeOrderInTransaction(tx, input, actor));
}
