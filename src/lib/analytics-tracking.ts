import { cookies } from "next/headers";
import { randomUUID, createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { attributionInput, eventTypes } from "./analytics-rules";
import { netLineAmounts } from "./returns-rules";
import { effectivePrice } from "./catalog";
import { orderTransaction } from "./order-lifecycle";
type Tx = Prisma.TransactionClient;
export async function visitorSession(utm?: unknown) {
  const jar = await cookies();
  if (jar.get("hn_analytics")?.value === "off") return null;
  const now = new Date();
  let key = jar.get("hn_visit")?.value;
  let session = key
    ? await db.visitorSession.findUnique({
        where: { keyHash: createHash("sha256").update(key).digest("hex") },
      })
    : null;
  if (!session || session.expiresAt < now) {
    key = randomUUID();
    const parsed = attributionInput.safeParse(utm ?? {});
    const tags = parsed.success ? parsed.data : attributionInput.parse({});
    session = await db.visitorSession.create({
      data: {
        keyHash: createHash("sha256").update(key).digest("hex"),
        ...tags,
        expiresAt: new Date(now.getTime() + 30 * 60000),
        events: { create: { eventKey: randomUUID(), type: "SESSION_STARTED" } },
      },
    });
  } else
    session = await db.visitorSession.update({
      where: { id: session.id },
      data: {
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + 30 * 60000),
      },
    });
  jar.set("hn_visit", key!, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1800,
  });
  return session;
}
export async function trackEvent(
  tx: Tx,
  visitorId: string | null,
  type: (typeof eventTypes)[number],
  eventKey: string,
  productId?: string,
  authenticated = false,
  metadata: Record<string, number | string> = {},
) {
  if (!visitorId) return;
  const old = await tx.analyticsEvent.findUnique({ where: { eventKey } });
  if (old) {
    if (
      old.visitorId !== visitorId ||
      old.type !== type ||
      old.productId !== (productId ?? null)
    )
      throw Error("Mã sự kiện đã được sử dụng cho nội dung khác.");
    return;
  }
  await tx.analyticsEvent.create({
    data: {
      visitorId,
      type,
      eventKey,
      productId,
      authenticated,
      metadataJson: JSON.stringify(metadata),
    },
  });
}
export async function recordPublicEvent(
  visitorId: string | null,
  type: "PRODUCT_VIEWED" | "PRODUCT_SEARCHED" | "CHECKOUT_STARTED",
  eventKey: string,
  productId?: string,
  authenticated = false,
  metadata: Record<string, number | string> = {},
) {
  return orderTransaction((tx) =>
    trackEvent(
      tx,
      visitorId,
      type,
      eventKey,
      productId,
      authenticated,
      metadata,
    ),
  );
}
export async function updateCartAnalytics(tx: Tx, cartId: string) {
  const items = await tx.cartItem.findMany({
    where: { cartId },
    include: { variant: { include: { product: true, colorRecord: true } } },
  });
  const snapshot = items
    .filter(
      (i) =>
        i.quantity > 0 &&
        i.variant.stock >= i.quantity &&
        i.variant.product.active &&
        i.variant.colorRecord?.active !== false &&
        effectivePrice(i.variant.product, i.variant) > 0,
    )
    .map((i) => ({
      productId: i.variant.productId,
      variantId: i.variantId,
      name: i.variant.product.name,
      quantity: i.quantity,
      unitPrice: effectivePrice(i.variant.product, i.variant),
    }));
  const old = await tx.cartAnalyticsCycle.findFirst({
    where: { cartId, orderId: null },
  });
  if (old)
    await tx.cartAnalyticsCycle.update({
      where: { id: old.id },
      data: {
        lastActivityAt: new Date(),
        snapshotJson: JSON.stringify(snapshot),
      },
    });
  else if (snapshot.length)
    await tx.cartAnalyticsCycle.create({
      data: { cartId, snapshotJson: JSON.stringify(snapshot) },
    });
  await tx.cart.update({
    where: { id: cartId },
    data: { updatedAt: new Date() },
  });
}
export async function captureOrderAnalytics(
  tx: Tx,
  orderId: string,
  cartId: string,
  visitor: Awaited<ReturnType<typeof visitorSession>>,
) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
  const net = netLineAmounts(order.items, order.discount);
  const costs = await tx.productCostHistory.findMany({
    where: {
      productId: { in: order.items.map((i) => i.productId) },
      effectiveFrom: { lte: order.createdAt },
    },
    orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
  });
  for (const i of order.items) {
    const cost =
      costs.find((c) => c.variantId === i.variantId) ??
      costs.find((c) => c.productId === i.productId && c.variantId === null);
    await tx.orderLineAnalytics.create({
      data: {
        orderItemId: i.id,
        netAmount: net[i.id],
        ...(cost
          ? {
              unitCost: cost.unitCost,
              costSource: cost.source,
              costCapturedAt: new Date(),
            }
          : {}),
      },
    });
  }
  const cycle = await tx.cartAnalyticsCycle.findFirst({
    where: { cartId, orderId: null },
  });
  if (cycle)
    await tx.cartAnalyticsCycle.update({
      where: { id: cycle.id },
      data: { orderId, convertedAt: new Date() },
    });
  if (visitor) {
    await tx.orderAttribution.create({
      data: {
        orderId,
        visitorId: visitor.id,
        source: visitor.source,
        medium: visitor.medium,
        campaign: visitor.campaign,
        content: visitor.content,
        term: visitor.term,
      },
    });
    await trackEvent(
      tx,
      visitor.id,
      "ORDER_PLACED",
      "order:" + orderId,
      undefined,
      !!order.userId,
    );
  }
}
export async function backfillNetAnalytics(client: PrismaClient = db) {
  // Read historical prices/discounts only; never assign a newly entered cost to old items.
  let cursor: string | undefined;
  let inserted = 0,
    invalid = 0;
  while (true) {
    const orders = await client.order.findMany({
      take: 100,
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { items: { include: { analytics: true } } },
    });
    if (!orders.length) break;
    for (const o of orders) {
      try {
        const net = netLineAmounts(o.items, o.discount);
        for (const i of o.items)
          if (!i.analytics) {
            await client.orderLineAnalytics.create({
              data: { orderItemId: i.id, netAmount: net[i.id] },
            });
            inserted++;
          }
      } catch {
        invalid++;
      }
    }
    cursor = orders.at(-1)!.id;
  }
  return { inserted, invalid };
}
