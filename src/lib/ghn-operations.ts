import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { orderTransaction, OrderActor } from "./order-lifecycle";
import { updateShipmentInTransaction } from "./shipping";
import { shipmentTransitions } from "./shipping-states";
import { ghnProvider } from "./shipping-providers";
import { ghnConfig, ghnStatusMap } from "./shipping-providers/ghn";
import {
  ProviderError,
  ProviderEvent,
  ProviderParcel,
} from "./shipping-providers/contract";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function requireAdmin(actor: OrderActor) {
  if (actor.role !== "ADMIN") throw new Error("Không có quyền thao tác GHN.");
}
function safeJSON(payload: unknown) {
  let text = JSON.stringify(payload);
  for (const secret of [
    process.env.GHN_STAGING_TOKEN,
    process.env.GHN_STAGING_WEBHOOK_SECRET,
  ])
    if (secret) text = text.split(secret).join("[REDACTED]");
  return text.slice(0, 10000);
}
async function load(id: string) {
  const s = await db.shipment.findUniqueOrThrow({
    where: { id },
    include: { order: true, payment: true },
  });
  if (s.provider !== "GHN_STAGING")
    throw new ProviderError("NOT_A_GHN_SHIPMENT");
  return s;
}
function parcel(s: Awaited<ReturnType<typeof load>>): ProviderParcel {
  if (s.parcelCount !== 1) throw new ProviderError("MULTIPARCEL_NOT_SUPPORTED");
  if (
    s.expectedCOD !== s.payment.amount ||
    s.payment.amount !== s.order.total ||
    s.payment.method !== "COD"
  )
    throw new ProviderError("COD_MISMATCH");
  return {
    clientRef: s.providerClientRef ?? s.reference,
    weight: s.weightGrams,
    length: s.lengthCm ?? 0,
    width: s.widthCm ?? 0,
    height: s.heightCm ?? 0,
    insuredValue: s.insuredValue,
    cod: s.payment.amount,
    content: s.parcelDescription,
    recipient: {
      name: s.recipientName,
      phone: s.recipientPhone,
      address: s.recipientAddress,
      province: s.order.province,
      ward: s.order.ward,
    },
  };
}
async function error(id: string, e: unknown, status?: string) {
  const code = e instanceof ProviderError ? e.code : "LOCAL_OPERATION_FAILED";
  await db.shipment.update({
    where: { id },
    data: {
      providerErrorCode: code,
      providerErrorAt: new Date(),
      ...(status ? { providerSyncStatus: status } : {}),
    },
  });
  return code;
}
export async function quoteGHN(id: string, actor: OrderActor) {
  requireAdmin(actor);
  const s = await load(id);
  try {
    const p = await ghnProvider();
    const fee = await p.calculateShippingFee(parcel(s));
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "GHN_FEE_QUOTE",
        targetId: id,
        detail: safeJSON({ ...fee, verification: p.verification }),
      },
    });
    return { ...fee, verification: p.verification };
  } catch (e) {
    throw new ProviderError(await error(id, e));
  }
}
function statePath(from: string, to: string): string[] | null {
  if (from === to) return [];
  const queue: { s: string; p: string[] }[] = [{ s: from, p: [] }];
  const seen = new Set([from]);
  while (queue.length) {
    const { s, p } = queue.shift()!;
    for (const next of shipmentTransitions[s] ?? []) {
      if (next === "CANCELED" && to !== "CANCELED") continue;
      if (
        ["RETURNING", "RETURNED"].includes(next) &&
        !["RETURNING", "RETURNED"].includes(to)
      )
        continue;
      if (
        next === "DELIVERY_FAILED" &&
        !["DELIVERY_FAILED", "RETURNING", "RETURNED"].includes(to)
      )
        continue;
      if (next === to) return [...p, next];
      if (!seen.has(next)) {
        seen.add(next);
        queue.push({ s: next, p: [...p, next] });
      }
    }
  }
  return null;
}
export async function applyGHNEvent(
  id: string,
  event: ProviderEvent,
  source: "GHN_POLL" | "GHN_WEBHOOK",
  actor: OrderActor,
  verification: string,
) {
  return orderTransaction(async (tx) => {
    const s = await tx.shipment.findUniqueOrThrow({
      where: { id },
      include: { order: true },
    });
    if (
      s.provider !== "GHN_STAGING" ||
      s.providerCode !== event.code ||
      s.providerClientRef !== event.clientRef ||
      s.providerShopId !== event.shopId
    )
      throw new ProviderError("PROVIDER_IDENTITY_MISMATCH");
    const key = hash(
      `${event.shopId}:${event.code}:${event.type}:${event.time}`,
    );
    const prior = await tx.shipmentEvent.findUnique({
      where: { providerEventKey: key },
    });
    if (prior) return { disposition: "DUPLICATE" };
    const time = new Date(event.time);
    if (!Number.isFinite(time.getTime()) || time.getTime() > Date.now() + 60000)
      throw new ProviderError("INVALID_EVENT_TIMESTAMP");
    const target = ghnStatusMap[event.status];
    let disposition = "APPLIED";
    if (s.providerLastEventAt && time <= s.providerLastEventAt)
      disposition = "OUT_OF_ORDER";
    else if (!["switch_status", "create"].includes(event.type))
      disposition = "EVIDENCE_ONLY";
    else if (!target) disposition = "REVIEW_REQUIRED";
    const path = target ? statePath(s.status, target) : null;
    if (disposition === "APPLIED" && !path) disposition = "INVALID_TRANSITION";
    if (
      disposition === "APPLIED" &&
      event.cod !== null &&
      event.cod !== s.expectedCOD
    )
      disposition = "COD_DISCREPANCY";
    if (disposition === "APPLIED")
      for (const next of path!) {
        await updateShipmentInTransaction(
          tx,
          {
            id,
            status: next,
            reason:
              next === "DELIVERY_FAILED"
                ? "GHN ghi nhận giao không thành công"
                : `Đồng bộ từ GHN ${event.status}; bước nội bộ suy ra`,
            reasonCode: next === "DELIVERY_FAILED" ? "UNSUCCESSFUL" : undefined,
          },
          { ...actor, role: "ADMIN" },
          "GHN_INFERRED",
        );
      }
    const claim = await tx.shipment.updateMany({
      where: { id, providerLastEventAt: s.providerLastEventAt },
      data: {
        providerLastSyncedAt: new Date(),
        ...(disposition === "APPLIED" ? { providerLastEventAt: time } : {}),
        providerSyncStatus: [
          "REVIEW_REQUIRED",
          "INVALID_TRANSITION",
          "COD_DISCREPANCY",
        ].includes(disposition)
          ? "REVIEW_REQUIRED"
          : "REGISTERED",
        providerVerification: verification,
        version: { increment: 1 },
        ...(disposition === "COD_DISCREPANCY"
          ? {
              discrepancyNote: "GHN COD khác nghĩa vụ trên đơn; cần kiểm tra",
              reconciliationStatus: "DISPUTED",
            }
          : {}),
      },
    });
    if (!claim.count) throw new ProviderError("CONCURRENT_SYNC_RETRY");
    await tx.shipmentEvent.create({
      data: {
        shipmentId: id,
        previousStatus: s.status,
        status: disposition === "APPLIED" ? target! : s.status,
        actorId: actor.id,
        source,
        providerEventKey: key,
        providerEventType: event.type,
        providerStatus: event.status,
        providerTimestamp: time,
        providerPayload: safeJSON(event.safePayload),
        disposition,
        reason: event.reasonCode
          ? `Mã ngoại lệ GHN: ${event.reasonCode}`
          : undefined,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "GHN_SYNC",
        targetId: id,
        detail: safeJSON({ key, disposition, providerStatus: event.status }),
      },
    });
    return { disposition };
  });
}
async function bind(
  id: string,
  code: string,
  fee: number | undefined,
  shopId: number,
  verification: string,
) {
  if (
    !/^[a-z0-9-]{1,80}$/i.test(code) ||
    code === process.env.GHN_STAGING_TOKEN
  )
    throw new ProviderError("INVALID_PROVIDER_CODE", true);
  return orderTransaction(async (tx) => {
    const s = await tx.shipment.findUniqueOrThrow({ where: { id } });
    if (s.providerCode && s.providerCode !== code)
      throw new ProviderError("PROVIDER_CODE_CONFLICT", true);
    await tx.shipment.update({
      where: { id },
      data: {
        providerCode: code,
        carrierReference: code,
        providerShopId: shopId,
        providerVerification: verification,
        providerSubmittedAt: s.providerSubmittedAt ?? new Date(),
        providerSyncStatus: "REGISTERED",
        providerErrorCode: null,
        ...(fee === undefined ? {} : { shippingFee: fee }),
      },
    });
  });
}
export async function submitGHN(id: string, actor: OrderActor) {
  requireAdmin(actor);
  let s = await load(id);
  const p = await ghnProvider();
  const input = parcel(s);
  if (s.providerCode)
    return { id, verification: s.providerVerification, unchanged: true };
  if (
    s.order.status !== "PROCESSING" ||
    s.order.paymentStatus !== "UNPAID" ||
    !["PENDING", "READY_FOR_PICKUP"].includes(s.status)
  )
    throw new ProviderError("ORDER_NOT_ELIGIBLE");
  const digest = hash(JSON.stringify(input));
  if (s.providerRequestDigest && s.providerRequestDigest !== digest)
    throw new ProviderError("SUBMISSION_PAYLOAD_CHANGED_REVIEW_REQUIRED");
  if (s.providerShopId && s.providerShopId !== p.config.shopId)
    throw new ProviderError("SHOP_CONFIGURATION_CHANGED");
  if (
    ["SUBMITTING", "CREATE_UNKNOWN", "LOOKUP_NOT_FOUND"].includes(
      s.providerSyncStatus,
    )
  ) {
    try {
      const found = await p.lookupShipment(input.clientRef);
      if (
        found.clientRef !== s.providerClientRef ||
        found.shopId !== p.config.shopId
      )
        throw new ProviderError("PROVIDER_IDENTITY_MISMATCH");
      await bind(id, found.code, undefined, p.config.shopId, p.verification);
      return await applyGHNEvent(id, found, "GHN_POLL", actor, p.verification);
    } catch (e) {
      if (!(e instanceof ProviderError) || e.code !== "NOT_FOUND") throw e;
      if (s.providerSyncStatus !== "LOOKUP_NOT_FOUND")
        throw new ProviderError("CREATE_UNKNOWN_REFRESH_BEFORE_RETRY", true);
    }
  }
  const claim = await db.shipment.updateMany({
    where: {
      id,
      version: s.version,
      providerCode: null,
      providerSyncStatus: {
        in: ["NOT_SUBMITTED", "CREATE_REJECTED", "LOOKUP_NOT_FOUND"],
      },
    },
    data: {
      providerSyncStatus: "SUBMITTING",
      providerShopId: p.config.shopId,
      providerCorrelationId: randomUUID(),
      providerRequestDigest: digest,
      version: { increment: 1 },
    },
  });
  if (!claim.count)
    throw new ProviderError("SUBMISSION_ALREADY_IN_PROGRESS", true);
  try {
    const created = await p.createShipment(input);
    await bind(id, created.code, created.fee, p.config.shopId, p.verification);
    s = await load(id);
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "GHN_SUBMITTED",
        targetId: id,
        detail: safeJSON({
          code: created.code,
          verification: p.verification,
          correlation: s.providerCorrelationId,
        }),
      },
    });
    return { id, code: created.code, verification: p.verification };
  } catch (e) {
    const uncertain = e instanceof ProviderError && e.uncertain;
    await error(id, e, uncertain ? "CREATE_UNKNOWN" : "CREATE_REJECTED");
    if (uncertain)
      try {
        const found = await p.lookupShipment(input.clientRef);
        if (
          found.clientRef !== s.providerClientRef ||
          found.shopId !== p.config.shopId
        )
          throw new ProviderError("PROVIDER_IDENTITY_MISMATCH");
        await bind(id, found.code, undefined, p.config.shopId, p.verification);
        await applyGHNEvent(id, found, "GHN_POLL", actor, p.verification);
        return { id, recovered: true, verification: p.verification };
      } catch {
        /* Remain unknown, never blind retry. */
      }
    throw new ProviderError(
      e instanceof ProviderError ? e.code : "SUBMISSION_UNCERTAIN",
      uncertain,
    );
  }
}
export async function syncGHN(id: string, actor: OrderActor) {
  requireAdmin(actor);
  const s = await load(id);
  const p = await ghnProvider();
  if (s.providerShopId && s.providerShopId !== p.config.shopId)
    throw new ProviderError("SHOP_CONFIGURATION_CHANGED");
  try {
    const e = s.providerCode
      ? await p.trackShipment(s.providerCode)
      : await p.lookupShipment(s.providerClientRef ?? s.reference);
    if (e.clientRef !== s.providerClientRef || e.shopId !== p.config.shopId)
      throw new ProviderError("PROVIDER_IDENTITY_MISMATCH");
    if (!s.providerCode)
      await bind(id, e.code, undefined, p.config.shopId, p.verification);
    return await applyGHNEvent(id, e, "GHN_POLL", actor, p.verification);
  } catch (e) {
    await error(
      id,
      e,
      e instanceof ProviderError && e.code === "NOT_FOUND" && !s.providerCode
        ? "LOOKUP_NOT_FOUND"
        : undefined,
    );
    throw new ProviderError(
      e instanceof ProviderError ? e.code : "SYNC_FAILED",
    );
  }
}
export async function cancelGHN(id: string, reason: string, actor: OrderActor) {
  requireAdmin(actor);
  const s = await load(id);
  const p = await ghnProvider();
  if (!s.providerCode || s.providerShopId !== p.config.shopId)
    throw new ProviderError("MISSING_OR_DIFFERENT_PROVIDER_REGISTRATION");
  try {
    const current = await p.getShipment(s.providerCode);
    if (
      current.code !== s.providerCode ||
      current.clientRef !== s.providerClientRef ||
      current.shopId !== p.config.shopId
    )
      throw new ProviderError("PROVIDER_IDENTITY_MISMATCH");
    if (current.status === "cancel")
      return await applyGHNEvent(
        id,
        current,
        "GHN_POLL",
        actor,
        p.verification,
      );
    if (
      !["PENDING", "READY_FOR_PICKUP"].includes(s.status) ||
      !["ready_to_pick", "picking"].includes(current.status)
    )
      throw new ProviderError("CANCEL_NOT_ELIGIBLE");
    const claim = await db.shipment.updateMany({
      where: {
        id,
        version: s.version,
        providerSyncStatus: { not: "CANCELING" },
      },
      data: { providerSyncStatus: "CANCELING", version: { increment: 1 } },
    });
    if (!claim.count) throw new ProviderError("CANCELLATION_IN_PROGRESS", true);
    await p.cancelShipment(s.providerCode, reason);
    await db.shipment.update({
      where: { id },
      data: { providerSyncStatus: "CANCEL_PENDING" },
    });
    return await syncGHN(id, actor);
  } catch (e) {
    await error(
      id,
      e,
      e instanceof ProviderError && e.uncertain
        ? "CANCEL_UNKNOWN"
        : e instanceof ProviderError && e.code === "CANCELLATION_REJECTED"
          ? "REGISTERED"
          : undefined,
    );
    throw new ProviderError(
      e instanceof ProviderError ? e.code : "CANCELLATION_FAILED",
      e instanceof ProviderError && e.uncertain,
    );
  }
}
export async function receiveGHNWebhook(
  header: string | null,
  payload: unknown,
) {
  const config = ghnConfig();
  const secret = process.env.GHN_STAGING_WEBHOOK_SECRET;
  const supplied = header ?? "";
  if (
    !secret ||
    secret.length < 32 ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(secret) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))
  )
    throw new ProviderError("UNAUTHENTICATED_WEBHOOK");
  const p = await ghnProvider();
  const event = p.normalizeTrackingEvent(payload);
  if (event.shopId !== config.shopId)
    throw new ProviderError("WEBHOOK_SHOP_MISMATCH");
  const s = await db.shipment.findUnique({
    where: { providerCode: event.code },
  });
  if (!s) throw new ProviderError("UNKNOWN_PROVIDER_SHIPMENT");
  return applyGHNEvent(
    s.id,
    event,
    "GHN_WEBHOOK",
    { id: "provider:ghn", label: "GHN staging callback", role: "ADMIN" },
    p.verification,
  );
}
