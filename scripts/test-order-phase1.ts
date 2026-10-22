import { packPreparedFixture } from "./test-support/packing-test-fixture";
import { authenticateCartFixture } from "./test-support/analytics-test-client";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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
  skipCartFixture = false;
  constructor(name?: string) {
    if (name)
      this.cookies.set(
        "hn_session",
        fixture.users.find((u: any) => u.name === name).token,
      );
  }
  async req(path: string, data?: unknown) {
    if (path === "/api/cart" && data !== undefined && !this.skipCartFixture)
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
      const pair = c.split(";")[0];
      const ix = pair.indexOf("=");
      this.cookies.set(pair.slice(0, ix), pair.slice(ix + 1));
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
const customer = {
  name: "Khách QA",
  phone: "0912345678",
  email: "qa@phase1.test",
  province: "Hưng Yên",
  ward: "Phường thử nghiệm",
  street: "123 Đường kiểm thử",
  details: "",
  notes: "Phase 1 isolated",
};
const results: { test: string; status: string; error?: string }[] = [];
async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ test: name, status: "PASS" });
    console.log("PASS", name);
  } catch (e) {
    results.push({ test: name, status: "FAIL", error: String(e) });
    console.log("FAIL", name, String(e));
  }
}
async function place(
  index: number,
  client = new Client(),
  quantity = 1,
  extra = {},
) {
  const v = fixture.fixtures[index];
  assert.equal(
    (await client.post("cart", { variantId: v.variantId, quantity })).status,
    200,
  );
  const key = randomUUID();
  const r = await client.post("checkout", {
    ...customer,
    idempotencyKey: key,
    ...extra,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const order = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
    include: { items: true, payments: true, history: true },
  });
  return { client, key, order, v };
}
const admin = new Client("admin");
async function transition(id: string, status: string) {
  const r = await admin.post("admin/order", {
    id,
    status,
    reason: `QA manual ${status}`,
    reference: "QA-SHIP-001",
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
}
let first: Awaited<ReturnType<typeof place>>;
await run(
  "01 successful order / server prices / discount / payment amount",
  async () => {
    first = await place(0, new Client("alice"), 2, {
      total: 1,
      subtotal: 1,
      shipping: 0,
      coupon: "PHASE1",
    });
    assert.equal(first.order.subtotal, 1080000);
    assert.equal(first.order.discount, 100000);
    assert.equal(first.order.shipping, 30000);
    assert.equal(first.order.total, 1010000);
    assert.equal(first.order.payments[0].amount, 1010000);
  },
);
await run(
  "02 stock changed after cart prevents checkout and rolls back",
  async () => {
    const c = new Client();
    const v = fixture.fixtures[1];
    await c.post("cart", { variantId: v.variantId, quantity: 2 });
    await db.productVariant.update({
      where: { id: v.variantId },
      data: { stock: 1 },
    });
    assert.notEqual(
      (await c.post("checkout", { ...customer, idempotencyKey: randomUUID() }))
        .status,
      200,
    );
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: v.variantId },
        })
      ).stock,
      1,
    );
  },
);
await run("03 concurrent buyers cannot oversell final unit", async () => {
  const v = fixture.fixtures[2];
  await db.productVariant.update({
    where: { id: v.variantId },
    data: { stock: 1 },
  });
  const a = new Client(),
    b = new Client();
  for (const c of [a, b])
    assert.equal(
      (await c.post("cart", { variantId: v.variantId, quantity: 1 })).status,
      200,
    );
  const out = await Promise.all(
    [a, b].map((c) =>
      c.post("checkout", { ...customer, idempotencyKey: randomUUID() }),
    ),
  );
  assert.equal(out.filter((r) => r.status === 200).length, 1);
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: v.variantId } }))
      .stock,
    0,
  );
});
await run("04 concurrent repeated checkout creates one order", async () => {
  const c = new Client();
  const v = fixture.fixtures[3];
  await c.post("cart", { variantId: v.variantId, quantity: 1 });
  const key = randomUUID();
  const out = await Promise.all(
    [1, 2].map(() => c.post("checkout", { ...customer, idempotencyKey: key })),
  );
  assert(
    out.every((r) => r.status === 200),
    JSON.stringify(out),
  );
  assert.equal(await db.order.count({ where: { idempotencyKey: key } }), 1);
});
await run("05 stock deducted exactly once including retry", async () => {
  const count = await db.inventoryMovement.count({
    where: { variantId: fixture.fixtures[3].variantId, delta: -1 },
  });
  assert.equal(count, 1);
  assert.equal(
    (
      await db.productVariant.findUniqueOrThrow({
        where: { id: fixture.fixtures[3].variantId },
      })
    ).stock,
    9,
  );
});
await run(
  "06 customer cancellation restores inventory and coupon",
  async () => {
    const r = await first.client.post("order/cancel", {
      id: first.order.id,
      reason: "Khách thay đổi nhu cầu",
    });
    assert.equal(r.status, 200);
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: first.v.variantId },
        })
      ).stock,
      10,
    );
    assert.equal(
      (await db.coupon.findUniqueOrThrow({ where: { code: "PHASE1" } })).used,
      0,
    );
  },
);
await run("07 concurrent repeated cancellation restores once", async () => {
  const x = await place(4);
  const req = {
    id: x.order.id,
    code: x.order.code,
    reason: "Hủy đơn kiểm thử",
  };
  const out = await Promise.all(
    [1, 2].map(() => x.client.post("order/cancel", req)),
  );
  assert(out.every((r) => r.status === 200));
  assert.equal(
    (
      await db.productVariant.findUniqueOrThrow({
        where: { id: x.v.variantId },
      })
    ).stock,
    10,
  );
  assert.equal(
    await db.inventoryMovement.count({
      where: { orderId: x.order.id, delta: 1 },
    }),
    1,
  );
});
await run(
  "08 invalid transition rejected without inventory mutation",
  async () => {
    const x = await place(5);
    assert.notEqual(
      (
        await admin.post("admin/order", {
          id: x.order.id,
          status: "DELIVERED",
          reason: "invalid",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: x.v.variantId },
        })
      ).stock,
      9,
    );
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: x.order.id } })).status,
      "PENDING",
    );
  },
);
let paidId = "";
await run(
  "09 COD independent / collection evidence / duplicate collection",
  async () => {
    const x = await place(6);
    paidId = x.order.id;
    for (const status of [
      "CONFIRMED",
      "PROCESSING",
      "SHIPPING",
      "DELIVERY_FAILED",
      "SHIPPING",
      "DELIVERED",
      "COMPLETED",
    ]) {
      await transition(x.order.id, status);
      const o = await db.order.findUniqueOrThrow({ where: { id: x.order.id } });
      assert.equal(o.paymentStatus, "UNPAID");
    }
    assert.notEqual(
      (await admin.post("admin/order", { id: x.order.id, paid: true })).status,
      200,
    );
    const out = await Promise.all(
      [1, 2].map(() =>
        admin.post("admin/order", {
          id: x.order.id,
          paid: true,
          reason: "Đối soát COD đã nhận",
          reference: "COD-QA-001",
        }),
      ),
    );
    assert(
      out.every((r) => r.status === 200),
      JSON.stringify(out),
    );
    assert.equal(
      await db.orderStatusHistory.count({
        where: { orderId: x.order.id, event: "COD_COLLECTED" },
      }),
      1,
    );
    const p = await db.payment.findFirstOrThrow({
      where: { orderId: x.order.id },
    });
    assert.equal(p.status, "PAID");
    assert(p.collectedAt);
    assert.equal(p.collectionReference, "COD-QA-001");
    assert.equal(p.collectedBy, fixture.users[0].id);
  },
);
await run("10 unauthorized payment or admin updates are rejected", async () => {
  for (const c of [new Client(), new Client("bob")])
    assert.notEqual(
      (
        await c.post("admin/order", {
          id: paidId,
          paid: true,
          reason: "fake",
          reference: "fake",
        })
      ).status,
      200,
    );
  assert.notEqual(
    (
      await admin.post("admin/order", {
        id: first.order.id,
        paid: true,
        reason: "fake",
        reference: "fake",
      })
    ).status,
    200,
  );
});
await run(
  "11 ownership / auth-only cart / anonymous denial / cross-user access",
  async () => {
    const x = await place(7, new Client("alice"));
    const bob = new Client("bob");
    const denied = await bob.req("/tai-khoan/don-hang/" + x.order.id);
    assert(denied.body.includes("Trang chưa được tìm thấy"));
    assert(!denied.body.includes(x.order.code));
    assert(!denied.body.includes(customer.street));
    assert.notEqual(
      (await bob.post("order/cancel", { id: x.order.id, reason: "fake" }))
        .status,
      200,
    );
    assert.equal(
      (await x.client.req("/tai-khoan/don-hang/" + x.order.id)).status,
      200,
    );
    const beforeOrders = await db.order.count();
    const anonymous = new Client();
    anonymous.skipCartFixture = true;
    const deniedCart = await anonymous.post("cart", {
      variantId: fixture.fixtures[8].variantId,
      quantity: 1,
    });
    assert.equal(deniedCart.status, 401);
    assert.equal(await db.order.count(), beforeOrders);
  },
);
await run(
  "12 historical item prices and totals survive catalog edits",
  async () => {
    const x = await place(9);
    await db.product.update({
      where: { id: x.v.id },
      data: { price: 9900000, salePrice: 8800000, name: "Đổi tên catalog" },
    });
    const o = await db.order.findUniqueOrThrow({
      where: { id: x.order.id },
      include: { items: true },
    });
    assert.equal(o.items[0].unitPrice, 540000);
    assert.equal(o.total, 570000);
    assert.equal(o.items[0].name, x.order.items[0].name);
  },
);
await run("13 traceable history / audit / stock / manual outcome", async () => {
  const h = await db.orderStatusHistory.findMany({
    where: { orderId: paidId },
    orderBy: { createdAt: "asc" },
  });
  assert.equal(h[0].event, "ORDER_CREATED");
  assert(h.every((r) => r.actorId && r.actorLabel));
  for (let i = 1; i < h.length; i++)
    assert.equal(h[i].previousStatus, h[i - 1].status);
  assert((await db.auditLog.count({ where: { targetId: paidId } })) > 1);
  assert.equal(
    await db.inventoryMovement.count({ where: { orderId: paidId } }),
    1,
  );
  assert(h.some((r) => r.note.includes("thủ công")));
});
await run(
  "14 admin/customer/track consistent totals variants and status",
  async () => {
    const x = await place(10, new Client("alice"));
    await transition(x.order.id, "CONFIRMED");
    for (const r of [
      await admin.req("/admin/don-hang/" + x.order.id),
      await x.client.req("/tai-khoan/don-hang/" + x.order.id),
    ]) {
      assert.equal(r.status, 200);
      assert(r.body.includes(x.order.code));
      assert(r.body.includes("570.000"));
      assert(r.body.includes("Đã xác nhận"));
      assert(r.body.includes("Trắng"));
      assert(r.body.includes("Chưa thanh toán"));
    }
    const track = await x.client.post("track", {
      code: x.order.code,
      phone: customer.phone,
    });
    assert.equal(track.body.status, "CONFIRMED");
    assert.equal(track.body.total, 570000);
    const dash = await admin.req("/admin/bao-cao");
    assert.equal(dash.status, 200);
    const collected = await db.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { total: true },
    });
    const metric = dash.body.match(
      /<span>Doanh thu đã thu<\/span><strong>([^<]+)<\/strong>/,
    );
    assert(metric, "Collected revenue metric is present");
    assert.equal(
      metric[1],
      new Intl.NumberFormat("vi-VN").format(collected._sum.total ?? 0) + "đ",
    );
  },
);
await run(
  "15 storefront / checkout / account / admin routes render",
  async () => {
    const c = new Client();
    for (const path of [
      "/",
      "/trang-phuc",
      "/gio-hang",
      "/thanh-toan",
      "/san-pham/" + fixture.fixtures[11].slug,
      "/tra-cuu-don-hang",
    ]) {
      const r = await c.req(path);
      assert.equal(r.status, 200, path);
      assert(!r.body.includes("Internal Server Error"), path);
    }
    assert.equal(
      (await new Client("alice").req("/tai-khoan/don-hang")).status,
      200,
    );
    assert.equal(
      (await admin.req("/admin/don-hang?q=HN-&status=PENDING")).status,
      200,
    );
  },
);
await run(
  "16 returned shipment cancellation / forbidden customer late cancellation",
  async () => {
    const x = await place(12, new Client("alice"));
    for (const status of [
      "CONFIRMED",
      "PROCESSING",
      "SHIPPING",
      "DELIVERY_FAILED",
      "RETURNED",
    ])
      await transition(x.order.id, status);
    assert.notEqual(
      (await x.client.post("order/cancel", { id: x.order.id, reason: "late" }))
        .status,
      200,
    );
    await transition(x.order.id, "CANCELLED");
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: x.v.variantId },
        })
      ).stock,
      10,
    );
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: x.order.id } }))
        .shippingStatus,
      "RETURNED",
    );
  },
);
await run("17 csrf and foreign checkout idempotency key rejected", async () => {
  const res = await fetch(base + "/api/admin/order", {
    method: "POST",
    headers: {
      origin: "https://foreign.test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ id: paidId, status: "CANCELLED" }),
  });
  assert.notEqual(res.status, 200);
  const c = new Client();
  await c.req("/api/cart");
  assert.notEqual(
    (await c.post("checkout", { ...customer, idempotencyKey: first.key }))
      .status,
    200,
  );
});
await writeFile(
  "verification/order-phase1-results.json",
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
