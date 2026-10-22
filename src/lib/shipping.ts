import { formatAddress } from "./localization/config";
import { actorPermission, requireActorPermission } from "./authorization";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  orderTransaction,
  changeOrderInTransaction,
  OrderActor,
} from "./order-lifecycle";
import {
  failureLabels,
  settlementTotals,
  validateShipmentTransition,
} from "./shipping-states";
async function audit(
  tx: Prisma.TransactionClient,
  actor: OrderActor,
  action: string,
  id: string,
  detail: unknown,
) {
  await tx.auditLog.create({
    data: {
      actorId: actor.id,
      resourceType: "SHIPMENT",
      result: "SUCCESS",
      afterJson: JSON.stringify(detail),
      action,
      targetId: id,
      detail: JSON.stringify(detail),
    },
  });
}
export async function createShipment(
  input: {
    orderId: string;
    provider: string;
    shippingFee: number;
    parcelDescription: string;
    weightGrams: number;
    parcelCount: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    insuredValue?: number;
  },
  actor: OrderActor,
) {
  await actorPermission(actor, "shipping.create");
  return orderTransaction(async (tx) => {
    if (input.provider !== "LOCAL_MANUAL")
      throw new Error("Chưa hỗ trợ hãng vận chuyển trực tuyến.");
    const order = await tx.order.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { payments: true, shipment: true },
    });
    if (order.shipment) throw new Error("Đơn đã có hồ sơ giao nhận.");
    if (order.packingHoldReason || !order.packedAt)
      throw Error(
        "Cần xác nhận kiểm tra đóng gói trước khi tạo hồ sơ giao nhận.",
      );
    if (
      order.status !== "PROCESSING" ||
      order.shippingStatus !== "NOT_DISPATCHED" ||
      order.paymentStatus !== "UNPAID"
    )
      throw new Error(
        "Chỉ tạo kiện cho đơn COD đang chuẩn bị, chưa bàn giao và chưa thanh toán.",
      );
    if (
      order.payments.length !== 1 ||
      order.payments[0].method !== "COD" ||
      order.payments[0].status !== "UNPAID" ||
      order.payments[0].amount !== order.total ||
      order.total <= 0
    )
      throw new Error("Bản ghi thanh toán COD không khớp đơn.");
    const reference = `HN-SHIP-${randomUUID().toUpperCase()}`;
    const shipment = await tx.shipment.create({
      data: {
        orderId: order.id,
        paymentId: order.payments[0].id,
        provider: input.provider,
        reference,
        providerClientRef: null,
        lengthCm: input.lengthCm,
        widthCm: input.widthCm,
        heightCm: input.heightCm,
        insuredValue: input.insuredValue ?? 0,
        shippingFee: input.shippingFee,
        expectedCOD: order.payments[0].amount,
        recipientName: order.name,
        recipientPhone: order.phone,
        recipientAddress: formatAddress(order),
        parcelDescription: input.parcelDescription,
        weightGrams: input.weightGrams,
        parcelCount: input.parcelCount,
        createdBy: actor.id,
        events: {
          create: {
            status: "PENDING",
            actorId: actor.id,
            reason: "Tạo hồ sơ giao nhận nội bộ; không phải vận đơn hãng.",
          },
        },
      },
    });
    await audit(tx, actor, "SHIPMENT_CREATED", shipment.id, {
      orderId: order.id,
      expectedCOD: shipment.expectedCOD,
      reference: shipment.reference,
    });
    return shipment;
  });
}
export type ShipmentChange = {
  id: string;
  status: string;
  reason?: string;
  reasonCode?: string;
};
export async function updateShipmentInTransaction(
  tx: Prisma.TransactionClient,
  input: ShipmentChange,
  actor: OrderActor,
  source = "LOCAL_MANUAL",
) {
  await requireActorPermission(tx, actor, "shipping.update");
  if (["DELIVERY_FAILED", "RETURNING", "RETURNED"].includes(input.status))
    await requireActorPermission(tx, actor, "shipping.failures.manage");
  if (input.status === "CANCELED")
    await requireActorPermission(tx, actor, "orders.cancel");
  const s = await tx.shipment.findUniqueOrThrow({
    where: { id: input.id },
    include: { order: true },
  });
  if (s.provider !== "LOCAL_MANUAL" && source === "LOCAL_MANUAL")
    throw new Error(
      "Kiện GHN phải đồng bộ từ provider; không sửa trạng thái thủ công.",
    );
  validateShipmentTransition(s.status, input.status);
  if (
    ["DELIVERY_FAILED", "RETURNING", "RETURNED", "CANCELED"].includes(
      input.status,
    ) &&
    (!input.reason || input.reason.trim().length < 3)
  )
    throw new Error("Cần ghi rõ lý do/kết quả giao nhận.");
  if (
    input.status === "DELIVERY_FAILED" &&
    !failureLabels[input.reasonCode ?? ""]
  )
    throw new Error("Chọn lý do giao thất bại hợp lệ.");
  const claim = await tx.shipment.updateMany({
    where: { id: s.id, version: s.version },
    data: { status: input.status, version: { increment: 1 } },
  });
  if (claim.count !== 1)
    throw new Error("Kiện vừa thay đổi, tải lại trước khi thao tác.");
  await tx.shipmentEvent.create({
    data: {
      shipmentId: s.id,
      previousStatus: s.status,
      status: input.status,
      actorId: actor.id,
      source,
      reason: input.reason,
    },
  });
  if (input.status === "DELIVERY_FAILED")
    await tx.deliveryAttempt.create({
      data: {
        shipmentId: s.id,
        actorId: actor.id,
        reasonCode: input.reasonCode!,
        note: input.reason!,
      },
    });
  let target: string | undefined;
  if (
    input.status === "PICKED_UP" ||
    (input.status === "OUT_FOR_DELIVERY" &&
      s.order.status === "DELIVERY_FAILED")
  )
    target = "SHIPPING";
  if (input.status === "DELIVERED") target = "DELIVERED";
  if (input.status === "DELIVERY_FAILED") target = "DELIVERY_FAILED";
  if (input.status === "RETURNING" && s.order.status === "SHIPPING")
    target = "DELIVERY_FAILED";
  if (input.status === "RETURNED") target = "RETURNED";
  if (input.status === "CANCELED") target = "CANCELLED";
  if (target && s.order.status !== target)
    await changeOrderInTransaction(
      tx,
      {
        id: s.orderId,
        status: target,
        reason: input.reason || "Ghi nhận giao nhận nội bộ",
        reference: s.reference,
      },
      actor,
      true,
    );
  await audit(tx, actor, "SHIPMENT_STATUS", s.id, {
    from: s.status,
    to: input.status,
    source,
    reason: input.reason,
    reasonCode: input.reasonCode,
  });
  return s.id;
}
export async function updateShipment(input: ShipmentChange, actor: OrderActor) {
  return orderTransaction((tx) =>
    updateShipmentInTransaction(tx, input, actor),
  );
}
export type FinancialInput = {
  id: string;
  eventKey: string;
  provider: string;
  reference: string;
  amount: number;
  evidence: string;
  occurredAt: string;
  correctsId?: string;
};
export async function recordCOD(
  kind: "collection" | "remittance",
  input: FinancialInput,
  actor: OrderActor,
) {
  await actorPermission(
    actor,
    kind === "collection" ? "cod.collection.confirm" : "cod.remittance.record",
  );
  return orderTransaction(async (tx) => {
    const s = await tx.shipment.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        order: true,
        payment: true,
        collections: true,
        remittances: true,
      },
    });
    const previous =
      kind === "collection"
        ? await tx.cODCollection.findUnique({
            where: { eventKey: input.eventKey },
          })
        : await tx.cODRemittance.findUnique({
            where: { eventKey: input.eventKey },
          });
    if (previous) {
      if (
        previous.shipmentId !== s.id ||
        previous.amount !== input.amount ||
        previous.reference !== input.reference ||
        previous.evidence !== input.evidence ||
        previous.provider !== input.provider ||
        previous.occurredAt.getTime() !==
          new Date(input.occurredAt).getTime() ||
        previous.correctsId !== (input.correctsId ?? null)
      )
        throw new Error("Mã thao tác đã dùng cho dữ liệu khác.");
      return { id: s.id, unchanged: true };
    }
    if (s.provider !== input.provider || s.status !== "DELIVERED")
      throw new Error(
        "Chỉ ghi nhận COD đúng nhà vận chuyển của kiện đã giao thành công.",
      );
    if (new Date(input.occurredAt) < s.order.createdAt)
      throw new Error("Chứng từ không được phát sinh trước đơn hàng.");
    if (s.reconciliationStatus === "RECONCILED")
      throw new Error(
        "Đã khóa đối soát; cần mở điều tra trước khi bổ sung/điều chỉnh.",
      );
    if (input.correctsId) {
      const original =
        kind === "collection"
          ? await tx.cODCollection.findUniqueOrThrow({
              where: { id: input.correctsId },
            })
          : await tx.cODRemittance.findUniqueOrThrow({
              where: { id: input.correctsId },
            });
      if (original.shipmentId !== s.id || original.correctsId)
        throw new Error("Bản gốc điều chỉnh không thuộc kiện này.");
    } else if (input.amount <= 0)
      throw new Error("Khoản thu/chuyển mới phải lớn hơn 0.");
    const collection =
        s.collectedCOD + (kind === "collection" ? input.amount : 0),
      remittance = s.remittedCOD + (kind === "remittance" ? input.amount : 0);
    if (
      collection < 0 ||
      remittance < 0 ||
      !Number.isSafeInteger(collection) ||
      !Number.isSafeInteger(remittance)
    )
      throw new Error("Tổng tiền điều chỉnh không hợp lệ.");
    if (kind === "collection") {
      const refunds = await tx.mockRefund.aggregate({
        where: {
          orderId: s.orderId,
          status: { in: ["PENDING", "APPROVED", "SIMULATED_COMPLETED"] },
        },
        _sum: { amount: true },
      });
      if (collection < (refunds._sum.amount ?? 0))
        throw new Error(
          "Điều chỉnh COD làm số thu thấp hơn khoản hoàn đã giữ/hoàn; cần xử lý hồ sơ hoàn trước.",
        );
    }
    if (kind === "remittance" && !s.collections.length)
      throw new Error("Cần chứng từ thu COD trước khi ghi nhận chuyển tiền.");
    const totals = settlementTotals(
      s.expectedCOD,
      collection,
      remittance,
      s.collections.length > 0 || kind === "collection",
    );
    const claim = await tx.shipment.updateMany({
      where: { id: s.id, version: s.version },
      data: {
        collectedCOD: collection,
        remittedCOD: remittance,
        outstandingCOD: totals.outstanding,
        reconciliationStatus: s.discrepancyNote ? "DISPUTED" : totals.status,
        version: { increment: 1 },
      },
    });
    if (!claim.count)
      throw new Error("Sổ COD vừa thay đổi, tải lại và thử lại.");
    const data = {
      shipmentId: s.id,
      eventKey: input.eventKey,
      provider: input.provider,
      reference: input.reference,
      amount: input.amount,
      evidence: input.evidence,
      occurredAt: new Date(input.occurredAt),
      actorId: actor.id,
      correctsId: input.correctsId,
    };
    const row =
      kind === "collection"
        ? await tx.cODCollection.create({ data })
        : await tx.cODRemittance.create({ data });
    if (kind === "collection") {
      const paid = collection >= s.expectedCOD;
      const status = paid ? "PAID" : "UNPAID";
      if (s.payment.amount !== s.expectedCOD || s.payment.method !== "COD")
        throw new Error("Khoản COD kỳ vọng không khớp payment gốc.");
      await tx.order.update({
        where: { id: s.orderId },
        data: { paymentStatus: status },
      });
      await tx.payment.update({
        where: { id: s.paymentId },
        data: {
          status,
          collectedAt: new Date(input.occurredAt),
          collectedBy: actor.id,
          collectionReference: input.reference,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: s.orderId,
          previousStatus: s.order.status,
          status: s.order.status,
          event: input.correctsId ? "COD_CORRECTED" : "COD_COLLECTED",
          actorId: actor.id,
          actorLabel: "Quản trị cửa hàng",
          note: paid
            ? "Đã ghi nhận khách thanh toán COD qua hồ sơ giao nhận thủ công."
            : "Đã ghi nhận thanh toán COD chưa đủ hoặc điều chỉnh có chứng từ.",
        },
      });
    }
    await audit(
      tx,
      actor,
      kind === "collection" ? "COD_COLLECTION" : "COD_REMITTANCE",
      s.id,
      {
        recordId: row.id,
        amount: input.amount,
        reference: input.reference,
        correctsId: input.correctsId,
        expected: s.expectedCOD,
        collected: collection,
        remitted: remittance,
        evidence: input.evidence,
      },
    );
    return { id: s.id };
  });
}
export async function reconcileCOD(
  input: {
    id: string;
    eventKey: string;
    action: "RECONCILE" | "DISPUTE";
    note: string;
  },
  actor: OrderActor,
) {
  await actorPermission(actor, "cod.reconcile");
  return orderTransaction(async (tx) => {
    const s = await tx.shipment.findUniqueOrThrow({
      where: { id: input.id },
      include: { collections: true },
    });
    const previous = await tx.cODReconciliation.findUnique({
      where: { eventKey: input.eventKey },
    });
    if (previous) {
      if (
        previous.shipmentId !== s.id ||
        previous.action !== input.action ||
        previous.note !== input.note
      )
        throw new Error("Mã thao tác đã dùng cho đối soát khác.");
      return { id: s.id, unchanged: true };
    }
    if (input.action === "RECONCILE" && s.reconciliationStatus === "RECONCILED")
      return { id: s.id, unchanged: true };
    const totals = settlementTotals(
      s.expectedCOD,
      s.collectedCOD,
      s.remittedCOD,
      s.collections.length > 0,
    );
    const matched =
      s.status === "DELIVERED" &&
      s.collectedCOD === s.expectedCOD &&
      s.remittedCOD === s.expectedCOD;
    const status =
      input.action === "DISPUTE" || !matched ? "DISPUTED" : "RECONCILED";
    const claim = await tx.shipment.updateMany({
      where: { id: s.id, version: s.version },
      data: {
        reconciliationStatus: status,
        reconciledBy: actor.id,
        reconciledAt: status === "RECONCILED" ? new Date() : null,
        reconciliationNote: input.note,
        discrepancyNote: status === "DISPUTED" ? input.note : null,
        version: { increment: 1 },
      },
    });
    if (!claim.count)
      throw new Error("Đối soát vừa thay đổi, tải lại và thử lại.");
    await tx.cODReconciliation.create({
      data: {
        shipmentId: s.id,
        eventKey: input.eventKey,
        action: input.action,
        previousStatus: s.reconciliationStatus,
        status,
        expected: s.expectedCOD,
        collected: s.collectedCOD,
        remitted: s.remittedCOD,
        outstanding: totals.outstanding,
        note: input.note,
        actorId: actor.id,
      },
    });
    await audit(tx, actor, "COD_RECONCILIATION", s.id, {
      action: input.action,
      from: s.reconciliationStatus,
      to: status,
      note: input.note,
    });
    return { id: s.id, status };
  });
}
// Explicit allowlist: never return amounts/evidence/actors/recipient snapshot to public tracking.
export const publicShipmentSelect = {
  reference: true,
  provider: true,
  status: true,
  carrierReference: true,
  providerVerification: true,
  events: {
    where: {
      OR: [
        { source: "LOCAL_MANUAL" },
        {
          source: { in: ["GHN_POLL", "GHN_WEBHOOK"] },
          disposition: { in: ["APPLIED", "REVIEW_REQUIRED"] },
        },
      ],
    },
    orderBy: { createdAt: "asc" as const },
    select: {
      status: true,
      previousStatus: true,
      createdAt: true,
      source: true,
    },
  },
};
