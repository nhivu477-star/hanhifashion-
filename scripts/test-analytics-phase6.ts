import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import {
  analyticsReport,
  analyticsRows,
  analyticsConsistency,
} from "../src/lib/analytics-report";
import { reportFilter, sections, csvRows } from "../src/lib/analytics-rules";
import {
  backfillNetAnalytics,
  trackEvent,
} from "../src/lib/analytics-tracking";
import { saveAnalyticsCost } from "../src/lib/analytics-cost";
import { qualityInclude, productQuality } from "../src/lib/product-quality";
if (!/^file:\.\/phase1-orders-[\w-]+\.db$/.test(process.env.DATABASE_URL ?? ""))
  throw Error("Isolated DB only");
const fixture = JSON.parse(
  await readFile("verification/phase1-fixtures.json", "utf8"),
);
const results: { test: string; status: string; error?: string }[] = [];
async function run(test: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ test, status: "PASS" });
    console.log("PASS", test);
  } catch (e) {
    results.push({ test, status: "FAIL", error: String(e) });
    console.error("FAIL", test, String(e));
  }
}
const filter = (section = "sales", extra = {}) =>
  reportFilter(
    {
      section,
      period: "custom",
      from: "2001-01-01",
      to: "2001-01-31",
      ...extra,
    },
    new Date("2001-02-02T00:00:00Z"),
  );
const report = (section = "sales", extra = {}) =>
  analyticsReport(filter(section, extra), "SUPER_ADMIN");
const metric = (r: Awaited<ReturnType<typeof report>>, label: string) =>
  r.metrics.find((m) => m.label === label)!.value;
const admin = await db.user.findFirstOrThrow({
  where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
});
const buyer = await db.user.create({
  data: {
    name: "Analytics fixture",
    email: randomUUID() + "@phase6.test",
    phone: "0900000000",
    passwordHash: admin.passwordHash,
    createdAt: new Date("2001-01-01"),
  },
});
const p = await db.product
  .findUniqueOrThrow({
    where: { id: fixture.fixtures[0].id },
    include: { variants: true },
  })
  .catch(() => db.product.findFirstOrThrow({ include: { variants: true } }));
const v = p.variants[0];
async function order(
  status: string,
  paid: string,
  qty: number,
  price: number,
  discount = 0,
  day = "2001-01-10",
) {
  const id = randomUUID();
  return db.order.create({
    data: {
      code: "ANA-" + id,
      accessToken: id,
      idempotencyKey: id,
      userId: buyer.id,
      name: "Fixture",
      phone: "0900000000",
      email: buyer.email,
      province: "QA",
      ward: "QA",
      street: "QA fixture",
      details: "",
      notes: "Synthetic isolated analytics fixture",
      status,
      paymentStatus: paid,
      subtotal: qty * price,
      discount,
      shipping: 30000,
      total: qty * price - discount + 30000,
      createdAt: new Date(day + "T12:00:00+07:00"),
      items: {
        create: {
          productId: p.id,
          variantId: v.id,
          name: p.name,
          sku: v.sku,
          size: "M",
          color: "Be",
          image: "",
          quantity: qty,
          unitPrice: price,
        },
      },
      payments: {
        create: {
          method: "COD",
          status: paid,
          amount: qty * price - discount + 30000,
        },
      },
    },
    include: { items: true, payments: true },
  });
}
const a = await order("DELIVERED", "PAID", 2, 100000, 20000);
const b = await order("COMPLETED", "UNPAID", 1, 200000);
await order("CANCELLED", "UNPAID", 5, 999999);
const c = await order("COMPLETED", "PAID", 1, 100000, 0, "2000-12-01");
await backfillNetAnalytics();
const original = JSON.stringify(
  await db.order.findMany({
    where: { id: { in: [a.id, b.id, c.id] } },
    include: { items: true },
  }),
);
await run("01 gross merchandise", async () =>
  assert.equal(metric(await report(), "Doanh số hàng trước giảm"), 400000),
);
await run("02 net after discount", async () =>
  assert.equal(metric(await report(), "Doanh số hàng ròng"), 380000),
);
await run("03 canceled units excluded", async () => {
  const r = await report("products");
  assert.equal(r.rows[0].units, 3);
  assert.equal(r.rows[0].canceledUnits, 5);
});
await run("04 unpaid COD is not paid sales", async () =>
  assert.equal(metric(await report(), "Doanh số hàng đã thanh toán"), 180000),
);
const request = await db.returnRequest.create({
  data: {
    reference: randomUUID(),
    eventKey: randomUUID(),
    payloadHash: "fixture",
    orderId: a.id,
    userId: buyer.id,
    resolution: "REFUND",
    reason: "Defect fixture",
    policyVersion: "72h",
    deliveredAt: new Date("2001-01-10"),
    deadline: new Date("2001-01-13"),
    items: {
      create: {
        orderItemId: a.items[0].id,
        quantity: 1,
        amount: 90000,
        disposition: "DAMAGED",
      },
    },
  },
});
const refund = await db.mockRefund.create({
  data: {
    reference: randomUUID(),
    requestId: request.id,
    orderId: a.id,
    paymentId: a.payments[0].id,
    amount: 100000,
    shippingAmount: 10000,
    reason: "Fixture",
    status: "SIMULATED_COMPLETED",
  },
});
await run("05 refund subtracts goods only", async () =>
  assert.equal(metric(await report(), "Doanh số hàng ròng"), 290000),
);
await run("06 partial line refund", async () =>
  assert.equal(metric(await report(), "Hoàn hàng đã hoàn tất"), 90000),
);
await run("07 AOV", async () =>
  assert.equal(metric(await report(), "AOV hàng ròng đã giao"), 145000),
);
await run("08 VN dates inclusive end", async () => {
  assert.equal(
    metric(await report("sales", { from: "2001-01-11" }), "Số đơn trong nhóm"),
    0,
  );
  assert.equal(filter().from.toISOString(), "2000-12-31T17:00:00.000Z");
});
await run(
  "catalog readiness matches existing Phase5 quality rules",
  async () => {
    const products = await db.product.findMany({ include: qualityInclude });
    const expected = products.reduce<Record<string, number>>(
      (counts, product) => {
        const status = productQuality(product).status;
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      },
      {},
    );
    const r = await report("products");
    assert.equal(
      metric(r, "Catalog cần xác minh (toàn bộ)"),
      expected["NEEDS REVIEW"] ?? 0,
    );
    assert.equal(
      metric(r, "Catalog lỗi cần rà soát (toàn bộ)"),
      expected.INVALID ?? 0,
    );
  },
);
await run("09 product ranking/filter", async () => {
  const r = await report("products", { product: p.id });
  assert.equal(r.rows[0].value, 290000);
  assert.equal((await report("sales", { product: "unknown" })).count, 0);
});
await run("10 color and size", async () => {
  const r = await report();
  assert.equal(r.extra.find((e) => e.title === "Theo màu")!.rows[0].name, "Be");
  assert.equal(
    r.extra.find((e) => e.title === "Theo kích cỡ")!.rows[0].value,
    290000,
  );
});
await run("11 first/returning cohorts", async () => {
  const r = await report("customers");
  const segment = r.extra.find((e) => e.title.startsWith("Phân khúc"))!;
  assert.equal(segment.rows[0].name, "Khách quay lại");
  assert.equal(segment.rows[0].aov, 145000);
});
await run("12 repeat purchase", async () =>
  assert.equal(
    metric(await report("customers"), "Tỷ lệ mua lặp trong kỳ"),
    100,
  ),
);
const visit = await db.visitorSession.create({
  data: {
    keyHash: randomUUID(),
    source: "newsletter",
    campaign: "spring",
    startedAt: new Date("2001-01-05"),
    expiresAt: new Date("2001-01-06"),
  },
});
const eventNames = [
  "SESSION_STARTED",
  "PRODUCT_VIEWED",
  "ADD_TO_CART_ATTEMPTED",
  "ADD_TO_CART_SUCCEEDED",
  "CHECKOUT_STARTED",
  "ORDER_PLACED",
];
for (const [i, type] of eventNames.entries())
  await db.analyticsEvent.create({
    data: {
      visitorId: visit.id,
      eventKey: randomUUID(),
      type,
      createdAt: new Date(new Date("2001-01-05").getTime() + i * 1000),
    },
  });
await run("13 ordered session funnel", async () =>
  assert.equal(metric(await report("funnel"), "Chuyển đổi phiên→đơn"), 100),
);
const base = "http://127.0.0.1:3101";
let cookies = "";
async function req(
  path: string,
  body?: unknown,
  auth = cookies,
  referer?: string,
) {
  const r = await fetch(base + path, {
    headers: {
      cookie: auth,
      ...(referer ? { referer } : {}),
      ...(body ? { "Content-Type": "application/json", origin: base } : {}),
    },
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!auth)
    cookies = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
  const text = await r.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data, text, headers: r.headers };
}
await run("14 authenticated cart success tracked", async () => {
  const user = fixture.users.find((u: any) => u.name === "alice");
  cookies = "hn_session=" + user.token;
  const r = await req("/api/cart", {
    variantId: fixture.fixtures[20].variantId,
    quantity: 1,
    eventKey: randomUUID(),
  });
  assert.equal(r.status, 200, r.text);
  assert(
    (await db.analyticsEvent.count({
      where: { type: "ADD_TO_CART_SUCCEEDED", authenticated: true },
    })) > 0,
  );
});
await run("15 anonymous cart attempt denied/tracked", async () => {
  const before = await db.analyticsEvent.count({
    where: { type: "ADD_TO_CART_ATTEMPTED", authenticated: false },
  });
  const r = await req("/api/cart", { variantId: v.id, quantity: 1 }, "");
  assert.equal(r.status, 401);
  assert.equal(
    r.data.redirect,
    "/dang-nhap?returnTo=" + encodeURIComponent("/san-pham/" + p.slug),
  );
  assert.equal(
    await db.analyticsEvent.count({
      where: { type: "ADD_TO_CART_ATTEMPTED", authenticated: false },
    }),
    before + 1,
  );
});
const cart = await db.cart.create({ data: { guestToken: randomUUID() } });
const snapshot = JSON.stringify([
  {
    productId: p.id,
    variantId: v.id,
    name: p.name,
    quantity: 2,
    unitPrice: 100000,
  },
]);
await db.cartAnalyticsCycle.create({
  data: {
    cartId: cart.id,
    firstSeenAt: new Date("2001-01-02"),
    lastActivityAt: new Date("2001-01-02"),
    snapshotJson: snapshot,
  },
});
await run("16 abandoned cohort and value", async () => {
  const r = await report("carts");
  assert.equal(metric(r, "Giỏ bỏ dở"), 1);
  assert.equal(metric(r, "Giá trị giỏ bỏ dở ước tính"), 200000);
});
await run("17 converted excluded", async () => {
  await db.cartAnalyticsCycle.updateMany({
    where: { cartId: cart.id },
    data: { orderId: a.id, convertedAt: new Date("2001-01-03") },
  });
  assert.equal(metric(await report("carts"), "Giỏ bỏ dở"), 0);
});
await run("18 duplicate event idempotency", async () => {
  const key = randomUUID();
  await db.$transaction((tx) =>
    trackEvent(tx, visit.id, "PRODUCT_VIEWED", key, p.id),
  );
  await db.$transaction((tx) =>
    trackEvent(tx, visit.id, "PRODUCT_VIEWED", key, p.id),
  );
  assert.equal(await db.analyticsEvent.count({ where: { eventKey: key } }), 1);
});
await run("19 no fabricated historical events", async () =>
  assert.equal(
    metric(
      await report("funnel", { from: "1999-01-01", to: "1999-01-02" }),
      "Phiên mới",
    ),
    0,
  ),
);
await run("20 missing cost remains null", async () =>
  assert.equal(metric(await report("profit"), "Lãi gộp toàn nhóm"), null),
);
await run("21 validated historical cost snapshot", async () => {
  for (const item of [a.items[0], b.items[0]])
    await saveAnalyticsCost(
      {
        orderItemId: item.id,
        unitCost: 40000,
        source: "Isolated QA source document at transaction time",
      },
      admin,
    );
  assert.equal(metric(await report("profit"), "Lãi gộp toàn nhóm"), 170000);
  assert.equal(metric(await report("profit"), "Độ phủ giá vốn"), 100);
});
await run("22 COD collected/remitted separated", async () => {
  const r = await analyticsReport(
    reportFilter({ section: "finance" }),
    "SUPER_ADMIN",
  );
  assert(r.metrics.some((m) => m.label === "Khách đã trả COD"));
  assert(r.metrics.some((m) => m.label === "COD đã chuyển về"));
  const raw = await db.shipment.aggregate({
    _sum: { collectedCOD: true, remittedCOD: true },
  });
  assert.equal(metric(r, "Khách đã trả COD"), raw._sum.collectedCOD ?? 0);
  assert.equal(metric(r, "COD đã chuyển về"), raw._sum.remittedCOD ?? 0);
});
await run("23 pending refund not realized", async () => {
  await db.mockRefund.update({
    where: { id: refund.id },
    data: { status: "APPROVED" },
  });
  assert.equal(metric(await report(), "Doanh số hàng ròng"), 380000);
  await db.mockRefund.update({
    where: { id: refund.id },
    data: { status: "SIMULATED_COMPLETED" },
  });
});
await run("24 analytics does not change stock", async () => {
  const before = JSON.stringify(
    await db.productVariant.findMany({ orderBy: { id: "asc" } }),
  );
  await report("inventory");
  assert.equal(
    JSON.stringify(
      await db.productVariant.findMany({ orderBy: { id: "asc" } }),
    ),
    before,
  );
});
await run("25 product return rate", async () => {
  const r = await report("products");
  assert.equal(r.rows[0].returnRate, 33.33);
  assert.equal(r.rows[0].units, 2);
});
await run("26 first touch attribution", async () => {
  await db.orderAttribution.create({
    data: {
      orderId: a.id,
      visitorId: visit.id,
      source: "newsletter",
      campaign: "spring",
      medium: "email",
      content: "",
      term: "",
    },
  });
  const r = await report("marketing");
  console.log("Attribution fixture", r.rows);
  assert(
    r.rows.some((x) => x.name === "newsletter / spring" && x.value === 90000),
  );
});
await run("27 CSV formula/quotes and totals", async () => {
  assert(csvRows([{ name: "=1+1", value: 20 }]).includes("'="));
  const auth =
    "hn_session=" + fixture.users.find((u: any) => u.name === "admin").token;
  const r = await req(
    "/api/analytics/export?section=sales&period=custom&from=2001-01-01&to=2001-01-31",
    undefined,
    auth,
  );
  assert.equal(r.status, 200);
  assert(r.text.includes("290000"));
  assert(r.headers.get("cache-control")?.includes("no-store"));
});
await run("28 unauthenticated API blocked", async () =>
  assert.equal((await req("/api/analytics/report", undefined, "")).status, 401),
);
await run("29 marketing cannot read finance/costs", async () => {
  const u = await db.user.create({
    data: {
      name: "Marketing QA",
      email: randomUUID() + "@phase6.test",
      phone: "0900000000",
      role: "MARKETING_STAFF",
      passwordHash: admin.passwordHash,
    },
  });
  const token = randomUUID();
  await db.session.create({
    data: {
      userId: u.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      permissionVersion: u.permissionVersion,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const auth = "hn_session=" + token;
  for (const section of ["profit", "finance", "customers"])
    assert.equal(
      (await req("/api/analytics/report?section=" + section, undefined, auth))
        .status,
      403,
    );
  assert.equal(
    (
      await req(
        "/api/analytics/cost",
        { sku: p.sku, unitCost: 1, source: "Unauthorized QA cost proof" },
        auth,
      )
    ).status,
    403,
  );
});
await run("30 original order prices preserved", async () =>
  assert.equal(
    JSON.stringify(
      await db.order.findMany({
        where: { id: { in: [a.id, b.id, c.id] } },
        include: { items: true },
      }),
    ),
    original,
  ),
);
await run("31 larger dataset benchmark / pagination / plans", async () => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++)
    await order("COMPLETED", "PAID", 1, 1000, 0, "2002-01-10");
  await backfillNetAnalytics();
  const times: Record<string, number> = {
    fixtureMs: performance.now() - start,
  };
  for (const section of sections) {
    const t = performance.now();
    const r = await analyticsReport(
      reportFilter({
        section,
        period: "custom",
        from: "2002-01-01",
        to: "2002-01-31",
      }),
      "SUPER_ADMIN",
    );
    times[section] = Math.round((performance.now() - t) * 100) / 100;
    assert(r.rows.length <= 24);
  }
  assert.equal(
    (await analyticsRows(filter("inventory"), "SUPER_ADMIN", 3, 0)).rows.length,
    3,
  );
  const plan = await db.$queryRaw(
    Prisma.sql`EXPLAIN QUERY PLAN SELECT id FROM "Order" WHERE status='COMPLETED' AND createdAt>=${new Date("2002-01-01").getTime()}`,
  );
  await writeFile(
    "verification/phase6-performance.json",
    JSON.stringify(
      { times, plan, memory: process.memoryUsage(), syntheticOrders: 1000 },
      (_, v) => (typeof v === "bigint" ? Number(v) : v),
      2,
    ),
  );
});
await run("32 consistency flags without repair", async () => {
  const r = await analyticsConsistency(filter());
  assert(r.every((x) => Number(x.value) >= 0));
});
await writeFile(
  "verification/phase6-results.json",
  JSON.stringify({ database: process.env.DATABASE_URL, results }, null, 2),
);
await db.$disconnect();
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
