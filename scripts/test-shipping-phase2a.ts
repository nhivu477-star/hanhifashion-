import { packPreparedFixture } from "./test-support/packing-test-fixture";
import { authenticateCartFixture } from "./test-support/analytics-test-client";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
if (!process.env.DATABASE_URL?.includes("phase1-orders"))
  throw Error("Isolated database required");
const db = new PrismaClient();
const fixture = JSON.parse(
  await readFile("verification/phase1-fixtures.json", "utf8"),
);
const base = "http://127.0.0.1:3101";
class Client {
  cookies = new Map<string, string>();
  constructor(name?: string) {
    if (name)
      this.cookies.set(
        "hn_session",
        fixture.users.find((u: any) => u.name === name).token,
      );
  }
  async req(path: string, data?: unknown) {
    if (path === "/api/cart" && data !== undefined)
      await authenticateCartFixture(db, this.cookies);
    const r = await fetch(base + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...(data === undefined
          ? {}
          : { "content-type": "application/json", origin: base }),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    for (const c of r.headers.getSetCookie()) {
      const p = c.split(";")[0],
        i = p.indexOf("=");
      this.cookies.set(p.slice(0, i), p.slice(i + 1));
    }
    const text = await r.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    if (
      r.status === 200 &&
      path === "/api/admin/order" &&
      (data as any)?.status === "PROCESSING"
    )
      await packPreparedFixture(db, this, (data as any).id);
    return { status: r.status, body };
  }
  post(action: string, data: unknown) {
    return this.req("/api/" + action, data);
  }
}
const admin = new Client("admin");
const results: { test: string; status: string; error?: string }[] = [];
async function run(test: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ test, status: "PASS" });
    console.log("PASS", test);
  } catch (e) {
    results.push({ test, status: "FAIL", error: String(e) });
    console.log("FAIL", test, String(e));
  }
}
const customer = {
  name: "Khách Giao Nhận QA",
  phone: "0912345678",
  email: "shipping@phase2a.test",
  province: "Hưng Yên",
  ward: "Phường kiểm thử",
  street: "123 Đường kiểm thử",
  details: "",
  notes: "",
};
async function order(index = 14, owner = "alice", prepare = true) {
  const c = new Client(owner),
    v = fixture.fixtures[index];
  assert.equal(
    (await c.post("cart", { variantId: v.variantId, quantity: 1 })).status,
    200,
  );
  const key = randomUUID();
  const r = await c.post("checkout", { ...customer, idempotencyKey: key });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const o = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
  });
  if (prepare)
    for (const status of ["CONFIRMED", "PROCESSING"])
      assert.equal(
        (await admin.post("admin/order", { id: o.id, status })).status,
        200,
      );
  return { o, c, v };
}
async function shipment(o: { id: string }) {
  const r = await admin.post("admin/shipping/create", {
    orderId: o.id,
    provider: "LOCAL_MANUAL",
    shippingFee: 25000,
    parcelDescription: "Một trang phục được đóng gói",
    weightGrams: 500,
    parcelCount: 1,
    expectedCOD: 1,
    recipientAddress: "forged",
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return db.shipment.findUniqueOrThrow({ where: { id: r.body.id } });
}
async function status(id: string, next: string) {
  const r = await admin.post("admin/shipping/status", {
    id,
    status: next,
    reason: `Ghi nhận QA ${next}`,
    reasonCode: next === "DELIVERY_FAILED" ? "RECIPIENT_REFUSED" : undefined,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
}
async function deliver(id: string) {
  for (const s of [
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ])
    await status(id, s);
}
function money(
  id: string,
  amount: number,
  kind = "collection",
  reference = `QA-${randomUUID()}`,
) {
  return {
    id,
    amount,
    provider: "LOCAL_MANUAL",
    reference,
    evidence: `Bằng chứng QA ${kind} - INTERNAL-EVIDENCE`,
    occurredAt: new Date().toISOString(),
    eventKey: randomUUID(),
  };
}
let first: Awaited<ReturnType<typeof order>>,
  s: Awaited<ReturnType<typeof shipment>>;
await run(
  "01 create eligible shipment / authoritative COD and address snapshot",
  async () => {
    first = await order();
    s = await shipment(first.o);
    assert.equal(s.expectedCOD, first.o.total);
    assert(s.reference.startsWith("HN-SHIP-"));
    assert.equal(s.carrierReference, null);
    assert(s.recipientAddress.includes(customer.street));
    assert(!s.recipientAddress.includes("forged"));
    assert.equal(s.shippingFee, 25000);
    assert.equal(s.provider, "LOCAL_MANUAL");
    assert.equal(
      await db.shipmentEvent.count({ where: { shipmentId: s.id } }),
      1,
    );
  },
);
await run(
  "02 reject ineligible/duplicate shipment and legacy bypass",
  async () => {
    const x = await order(15, "alice", false);
    assert.notEqual(
      (
        await admin.post("admin/shipping/create", {
          orderId: x.o.id,
          provider: "LOCAL_MANUAL",
          shippingFee: 0,
          parcelDescription: "QA test",
          weightGrams: 1,
          parcelCount: 1,
        })
      ).status,
      200,
    );
    assert.notEqual(
      (
        await admin.post("admin/shipping/create", {
          orderId: first.o.id,
          provider: "LOCAL_MANUAL",
          shippingFee: 0,
          parcelDescription: "QA test",
          weightGrams: 1,
          parcelCount: 1,
        })
      ).status,
      200,
    );
    assert.notEqual(
      (
        await admin.post("admin/order", {
          id: first.o.id,
          status: "SHIPPING",
          reason: "bypass",
        })
      ).status,
      200,
    );
  },
);
await run("03 reject invalid shipment edge without events", async () => {
  assert.notEqual(
    (
      await admin.post("admin/shipping/status", {
        id: s.id,
        status: "DELIVERED",
      })
    ).status,
    200,
  );
  assert.equal(
    await db.shipmentEvent.count({ where: { shipmentId: s.id } }),
    1,
  );
});
await run(
  "04 delivered shipment/order consistency and manual event source",
  async () => {
    await deliver(s.id);
    const fresh = await db.shipment.findUniqueOrThrow({
      where: { id: s.id },
      include: { events: true, order: true },
    });
    assert.equal(fresh.status, "DELIVERED");
    assert.equal(fresh.order.status, "DELIVERED");
    assert(fresh.events.every((e) => e.actorId && e.source === "LOCAL_MANUAL"));
    assert.equal(fresh.events.length, 6);
  },
);
await run(
  "05 delivered COD stays unpaid / legacy collection blocked",
  async () => {
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: first.o.id } }))
        .paymentStatus,
      "UNPAID",
    );
    assert.notEqual(
      (
        await admin.post("admin/order", {
          id: first.o.id,
          paid: true,
          reason: "bypass",
          reference: "fake",
        })
      ).status,
      200,
    );
    assert.equal(
      await db.cODCollection.count({ where: { shipmentId: s.id } }),
      0,
    );
  },
);
let collect: ReturnType<typeof money>;
await run(
  "06 evidenced collection / customer paid but not store settlement",
  async () => {
    collect = money(s.id, s.expectedCOD);
    const collected = await admin.post("admin/shipping/collection", collect);
    assert.equal(collected.status, 200, JSON.stringify(collected.body));
    const fresh = await db.shipment.findUniqueOrThrow({
      where: { id: s.id },
      include: { order: true },
    });
    assert.equal(fresh.reconciliationStatus, "COLLECTED");
    assert.equal(fresh.outstandingCOD, s.expectedCOD);
    assert.equal(fresh.order.paymentStatus, "PAID");
    assert.equal(await db.payment.count({ where: { orderId: first.o.id } }), 1);
    const r = await admin.req("/admin/bao-cao");
    const legacy = await db.order.aggregate({
      where: { paymentStatus: "PAID", shipment: null },
      _sum: { total: true },
    });
    assert(
      r.body.includes(
        `<span>Doanh thu đã thu</span><strong>${new Intl.NumberFormat("vi-VN").format(legacy._sum.total ?? 0)}đ</strong>`,
      ),
    );
  },
);
await run(
  "07 duplicate financial collection cannot duplicate records",
  async () => {
    const rs = await Promise.all(
      [1, 2].map(() => admin.post("admin/shipping/collection", collect)),
    );
    assert(rs.every((r) => r.status === 200));
    assert.equal(
      await db.cODCollection.count({ where: { shipmentId: s.id } }),
      1,
    );
    assert.notEqual(
      (
        await admin.post("admin/shipping/collection", {
          ...collect,
          eventKey: randomUUID(),
        })
      ).status,
      200,
    );
    assert.notEqual(
      (
        await admin.post("admin/shipping/collection", {
          ...collect,
          amount: collect.amount + 1,
        })
      ).status,
      200,
    );
    assert.notEqual(
      (
        await admin.post("admin/shipping/collection", {
          ...money(s.id, 100),
          evidence: "",
        })
      ).status,
      200,
    );
  },
);
await run(
  "08 remittance bound to provider/shipment / precise VND",
  async () => {
    assert.notEqual(
      (
        await admin.post("admin/shipping/remittance", {
          ...money(s.id, 1, "remittance"),
          provider: "FAKE",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await admin.post(
          "admin/shipping/remittance",
          money(s.id, 100000, "remittance"),
        )
      ).status,
      200,
    );
    assert.equal(
      (await db.shipment.findUniqueOrThrow({ where: { id: s.id } }))
        .remittedCOD,
      100000,
    );
  },
);
await run("09 partial remittance remains outstanding", async () => {
  const fresh = await db.shipment.findUniqueOrThrow({ where: { id: s.id } });
  assert.equal(fresh.reconciliationStatus, "PARTIALLY_REMITTED");
  assert.equal(fresh.outstandingCOD, s.expectedCOD - 100000);
});
await run(
  "10 discrepancies cannot be hidden / correction append-only",
  async () => {
    const r = await admin.post("admin/shipping/reconcile", {
      id: s.id,
      eventKey: randomUUID(),
      action: "RECONCILE",
      note: "Kiểm tra thiếu tiền, cần điều tra",
    });
    assert.equal(r.status, 200);
    assert.equal(
      (await db.shipment.findUniqueOrThrow({ where: { id: s.id } }))
        .reconciliationStatus,
      "DISPUTED",
    );
    assert.equal(
      (
        await admin.post(
          "admin/shipping/remittance",
          money(s.id, s.expectedCOD - 100000, "remittance"),
        )
      ).status,
      200,
    );
    const remit = money(s.id, 1000, "remittance");
    assert.equal(
      (await admin.post("admin/shipping/remittance", remit)).status,
      200,
    );
    const original = await db.cODRemittance.findUniqueOrThrow({
      where: { eventKey: remit.eventKey },
    });
    assert.equal(
      (
        await admin.post("admin/shipping/remittance", {
          ...money(s.id, -1000, "remittance"),
          correctsId: original.id,
        })
      ).status,
      200,
    );
    assert.equal(
      (await db.cODRemittance.findUniqueOrThrow({ where: { id: original.id } }))
        .amount,
      1000,
    );
    assert.equal(
      (await db.shipment.findUniqueOrThrow({ where: { id: s.id } }))
        .reconciliationStatus,
      "DISPUTED",
    );
  },
);
let returned: Awaited<ReturnType<typeof order>>,
  rs: Awaited<ReturnType<typeof shipment>>;
await run(
  "11 failed delivery attempt and returning keep stock deducted",
  async () => {
    returned = await order(16);
    rs = await shipment(returned.o);
    for (const x of [
      "READY_FOR_PICKUP",
      "PICKED_UP",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERY_FAILED",
    ])
      await status(rs.id, x);
    const a = await db.deliveryAttempt.findFirstOrThrow({
      where: { shipmentId: rs.id },
    });
    assert.equal(a.reasonCode, "RECIPIENT_REFUSED");
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: returned.v.variantId },
        })
      ).stock,
      9,
    );
    await status(rs.id, "RETURNING");
    assert.notEqual(
      (
        await admin.post("admin/order", {
          id: returned.o.id,
          status: "CANCELLED",
          reason: "too early",
        })
      ).status,
      200,
    );
  },
);
await run(
  "12 actual return then cancellation restores stock exactly once",
  async () => {
    await status(rs.id, "RETURNED");
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: returned.v.variantId },
        })
      ).stock,
      9,
    );
    const req = {
      id: returned.o.id,
      status: "CANCELLED",
      reason: "Đã kiểm tra hàng quay về",
    };
    const out = await Promise.all(
      [1, 2].map(() => admin.post("admin/order", req)),
    );
    assert(out.every((r) => r.status === 200));
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: returned.v.variantId },
        })
      ).stock,
      10,
    );
    assert.equal(
      await db.inventoryMovement.count({
        where: { orderId: returned.o.id, delta: 1 },
      }),
      1,
    );
  },
);
await run(
  "13 customer shipment timeline excludes internal financial data",
  async () => {
    const r = await first.c.req(`/tai-khoan/don-hang/${first.o.id}`);
    assert.equal(r.status, 200);
    assert(r.body.includes(s.reference));
    assert(r.body.includes("Thông tin giao nhận"));
    assert(r.body.includes("Đã giao"));
    assert(!r.body.includes("INTERNAL-EVIDENCE"));
    assert(!r.body.includes(collect.reference));
    const t = await first.c.post("track", {
      code: first.o.code,
      phone: customer.phone,
    });
    for (const provider of ["GHN_STAGING", "GHN", "GHTK", "VIETTEL_POST"]) {
      const blocked = await admin.post("admin/shipping/create", {
        orderId: first.o.id,
        provider,
        shippingFee: 0,
        parcelDescription: "Demo only",
        weightGrams: 500,
        parcelCount: 1,
      });
      assert.notEqual(blocked.status, 200);
    }
    assert.equal(
      (await admin.post("admin/ghn/submit", { id: s.id })).status,
      410,
    );
    assert.equal((await first.c.post("shipping/ghn/webhook", {})).status, 410);
    assert.equal(t.body.shipment.reference, s.reference);
    assert.equal(t.body.shipment.events.length, 6);
    for (const key of [
      "collectedCOD",
      "remittedCOD",
      "reconciliationStatus",
      "recipientAddress",
      "collections",
      "reconciliations",
    ])
      assert(!(key in t.body.shipment));
    assert(!JSON.stringify(t.body).includes("INTERNAL-EVIDENCE"));
  },
);
await run("14 cross-customer shipment access denied", async () => {
  const r = await new Client("bob").req(`/tai-khoan/don-hang/${first.o.id}`);
  assert(r.body.includes("Trang chưa được tìm thấy"));
  assert(!r.body.includes(s.reference));
  assert(!r.body.includes(customer.street));
  const t = await new Client("bob").post("track", {
    code: first.o.code,
    phone: "0900000000",
  });
  assert.notEqual(t.status, 200);
});
await run(
  "15 unauthorized STAFF/customer cannot record or reconcile",
  async () => {
    const raw = randomUUID();
    const staff = await db.user.create({
      data: {
        name: "Staff QA",
        email: `staff-${raw}@phase2a.test`,
        phone: "",
        passwordHash: "unusable",
        role: "STAFF",
      },
    });
    await db.session.create({
      data: {
        userId: staff.id,
        tokenHash: createHash("sha256").update(raw).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const c = new Client();
    c.cookies.set("hn_session", raw);
    for (const client of [c, new Client("alice"), new Client()]) {
      assert.notEqual(
        (
          await client.post("admin/shipping/reconcile", {
            id: s.id,
            eventKey: randomUUID(),
            action: "RECONCILE",
            note: "unauthorized",
          })
        ).status,
        200,
      );
      assert.notEqual(
        (await client.post("admin/shipping/collection", money(s.id, 1))).status,
        200,
      );
    }
  },
);
await run(
  "16 concurrent reconciliation creates one settlement / audit",
  async () => {
    const before = await db.cODReconciliation.count({
      where: { shipmentId: s.id, status: "RECONCILED" },
    });
    const payload = {
      id: s.id,
      eventKey: randomUUID(),
      action: "RECONCILE",
      note: "Đã đối chiếu chứng từ đủ tiền",
    };
    const out = await Promise.all(
      [1, 2].map(() => admin.post("admin/shipping/reconcile", payload)),
    );
    assert(
      out.every((r) => r.status === 200),
      JSON.stringify(out),
    );
    assert.equal(
      await db.cODReconciliation.count({
        where: { shipmentId: s.id, status: "RECONCILED" },
      }),
      before + 1,
    );
    assert.equal(
      (await db.shipment.findUniqueOrThrow({ where: { id: s.id } }))
        .reconciliationStatus,
      "RECONCILED",
    );
    assert.notEqual(
      (
        await admin.post(
          "admin/shipping/remittance",
          money(s.id, 1, "remittance"),
        )
      ).status,
      200,
    );
    const html = await admin.req(`/admin/van-chuyen/${s.id}`);
    assert(html.body.includes("Đã đối soát"));
    assert(html.body.includes(collect.reference));
    assert(
      (await db.auditLog.count({
        where: { targetId: s.id, action: "COD_RECONCILIATION" },
      })) >= 2,
    );
  },
);
await run("17 Phase 1 regression evidence 17/17", async () => {
  const r = JSON.parse(
    await readFile("verification/order-phase1-results.json", "utf8"),
  );
  assert.equal(r.database, process.env.DATABASE_URL);
  assert.equal(r.results.length, 17);
  assert(r.results.every((t: any) => t.status === "PASS"));
});
await run(
  "18 pre-pickup cancel synchronizes order and stock / no second shipment",
  async () => {
    const x = await order(17);
    const sh = await shipment(x.o);
    await status(sh.id, "READY_FOR_PICKUP");
    await status(sh.id, "CANCELED");
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: x.o.id } })).status,
      "CANCELLED",
    );
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: x.v.variantId },
        })
      ).stock,
      10,
    );
    assert.notEqual(
      (
        await admin.post("admin/shipping/create", {
          orderId: x.o.id,
          provider: "LOCAL_MANUAL",
          shippingFee: 0,
          parcelDescription: "retry",
          weightGrams: 1,
          parcelCount: 1,
        })
      ).status,
      200,
    );
  },
);
await writeFile(
  "verification/shipping-phase2a-results.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      database: process.env.DATABASE_URL,
      results,
    },
    null,
    2,
  ),
);
await db.$disconnect();
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
