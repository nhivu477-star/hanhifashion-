import { packPreparedFixture } from "./test-support/packing-test-fixture";
import { authenticateCartFixture } from "./test-support/analytics-test-client";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { hash } from "bcryptjs";
if (!/^file:\.\/phase1-orders-[\w-]+\.db$/.test(process.env.DATABASE_URL ?? ""))
  throw Error("Isolated database only");
const db = new PrismaClient(),
  fixture = JSON.parse(
    await readFile("verification/phase1-fixtures.json", "utf8"),
  ),
  base = "http://127.0.0.1:3101";
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
  post(path: string, data: unknown) {
    return this.req("/api/" + path, data);
  }
}
const alice = new Client("alice"),
  bob = new Client("bob"),
  admin = new Client("admin"),
  guest = new Client();
// Dedicated Phase 3 customer keeps checkout rate limits independent of regression traffic.
const qaPassword = randomUUID(),
  qaToken = randomUUID();
const qaUser = await db.user.create({
  data: {
    name: "alice Phase 3",
    email: `alice-p3-${randomUUID()}@qa.test`,
    phone: "0912345678",
    passwordHash: await hash(qaPassword, 10),
    role: "CUSTOMER",
  },
});
await db.session.create({
  data: {
    userId: qaUser.id,
    tokenHash: createHash("sha256").update(qaToken).digest("hex"),
    expiresAt: new Date(Date.now() + 86400000),
  },
});
alice.cookies.set("hn_session", qaToken);
Object.assign(
  fixture.users.find((u: any) => u.name === "alice"),
  { id: qaUser.id, email: qaUser.email, token: qaToken, password: qaPassword },
);
const results: { test: string; status: string; error?: string }[] = [];
async function run(test: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ test, status: "PASS" });
    console.log("PASS", test);
  } catch (e) {
    results.push({ test, status: "FAIL", error: String(e) });
    console.log("FAIL", test, String(e).slice(0, 900));
  }
}
const ok = async (p: Promise<{ status: number; body: any }>) => {
  const r = await p;
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
};
const failed = async (p: Promise<{ status: number; body: any }>) => {
  const r = await p;
  assert.notEqual(r.status, 200);
  return r;
};
const money = (id: string, amount: number) => ({
  id,
  amount,
  provider: "LOCAL_MANUAL",
  reference: `P3-${randomUUID()}`,
  evidence: "Chứng từ mô phỏng QA nội bộ",
  occurredAt: new Date().toISOString(),
  eventKey: randomUUID(),
});
async function makeOrder(quantity = 2, paid = true, coupon = false) {
  const raw = randomUUID();
  const v = await db.productVariant.create({
    data: {
      productId: fixture.fixtures[18].id,
      sku: `P3-${raw}`,
      size: raw,
      color: "Trắng",
      colorHex: "#ffffff",
      stock: 10,
    },
  });
  await ok(alice.post("cart", { variantId: v.id, quantity }));
  const key = randomUUID();
  await ok(
    alice.post("checkout", {
      name: "Khách Phase 3",
      phone: "0912345678",
      email: "phase3@qa.test",
      province: "Hà Nội",
      ward: "Phường Hoàn Kiếm",
      street: "123 Đường kiểm thử",
      details: "",
      notes: "",
      idempotencyKey: key,
      ...(coupon ? { coupon: "PHASE1" } : {}),
    }),
  );
  const o = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
    include: { items: true, payments: true },
  });
  for (const status of ["CONFIRMED", "PROCESSING"])
    await ok(admin.post("admin/order", { id: o.id, status }));
  const sh = await ok(
    admin.post("admin/shipping/create", {
      orderId: o.id,
      provider: "LOCAL_MANUAL",
      shippingFee: 30000,
      parcelDescription: "Kiện Phase 3",
      weightGrams: 500,
      parcelCount: 1,
    }),
  );
  for (const status of [
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ])
    await ok(
      admin.post("admin/shipping/status", {
        id: sh.id,
        status,
        reason: "Giao mô phỏng QA",
      }),
    );
  if (paid)
    await ok(admin.post("admin/shipping/collection", money(sh.id, o.total)));
  return { o, v, sh };
}
async function request(
  x: Awaited<ReturnType<typeof makeOrder>>,
  quantity = 1,
  resolution = "REFUND",
  extras = {},
) {
  return ok(
    alice.post("returns", {
      orderId: x.o.id,
      eventKey: randomUUID(),
      claimType: "DEFECT",
      resolution,
      reason: "Sản phẩm bị lỗi đường may cần kiểm tra",
      items: [{ orderItemId: x.o.items[0].id, quantity }],
      ...extras,
    }),
  );
}
async function detail(id: string) {
  return db.returnRequest.findUniqueOrThrow({
    where: { id },
    include: { items: true, refund: true },
  });
}
async function state(id: string, status: string) {
  return ok(
    admin.post("admin/returns/status", {
      id,
      status,
      reason: "Xác minh lỗi và thống nhất với khách",
    }),
  );
}
async function receive(id: string) {
  for (const s of ["UNDER_REVIEW", "APPROVED", "RECEIVED"]) await state(id, s);
}
async function inspect(id: string, condition = "DAMAGED") {
  const r = await detail(id);
  return admin.post("admin/returns/inspect", {
    id,
    itemId: r.items[0].id,
    condition,
    reason: "Kiểm tra hàng trả tại kho mô phỏng",
    evidence: "Hồ sơ kiểm tra nội bộ QA",
  });
}
let first!: Awaited<ReturnType<typeof makeOrder>>,
  r1!: { id: string },
  r2!: { id: string },
  exchangeOrder!: Awaited<ReturnType<typeof makeOrder>>,
  exchangeReq!: { id: string };
await run(
  "01 valid authenticated defect request / policy snapshot / image",
  async () => {
    first = await makeOrder(2, true, true);
    const png = await sharp({
      create: { width: 12, height: 12, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    r1 = await request(first, 1, "REFUND", {
      evidence: [{ data: `data:image/png;base64,${png.toString("base64")}` }],
    });
    const r = await detail(r1.id);
    assert.equal(r.status, "REQUESTED");
    assert.equal(+r.deadline - +r.deliveredAt, 72 * 3600000);
    assert.equal(r.items[0].quantity, 1);
    const image = await db.returnEvidence.findFirstOrThrow({
      where: { requestId: r.id },
    });
    assert.equal(
      (await alice.req(`/api/returns/evidence/${image.id}`)).status,
      200,
    );
    assert.equal(
      (await bob.req(`/api/returns/evidence/${image.id}`)).status,
      404,
    );
    assert.equal(
      (await guest.req(`/api/returns/evidence/${image.id}`)).status,
      403,
    );
  },
);
await run("02 expired return rejected from actual delivery time", async () => {
  const x = await makeOrder();
  await db.shipmentEvent.updateMany({
    where: { shipmentId: x.sh.id, status: "DELIVERED" },
    data: { createdAt: new Date(Date.now() - 73 * 3600000) },
  });
  await failed(
    alice.post("returns", {
      orderId: x.o.id,
      eventKey: randomUUID(),
      claimType: "DEFECT",
      resolution: "REFUND",
      reason: "Sản phẩm bị lỗi cần kiểm tra",
      items: [{ orderItemId: x.o.items[0].id, quantity: 1 }],
    }),
  );
});
await run("03 guest cannot request even with order capability", async () => {
  await failed(guest.post("returns", { orderId: first.o.id }));
});
await run("04 cross-customer order/item denied", async () => {
  await failed(
    bob.post("returns", {
      orderId: first.o.id,
      eventKey: randomUUID(),
      claimType: "DEFECT",
      resolution: "REFUND",
      reason: "Sản phẩm bị lỗi cần kiểm tra",
      items: [{ orderItemId: first.o.items[0].id, quantity: 1 }],
    }),
  );
});
await run("05 partial quantity leaves remaining eligible units", async () => {
  assert.equal((await detail(r1.id)).items[0].quantity, 1);
  r2 = await request(first, 1);
  assert.equal(
    await db.returnItem.count({ where: { orderItemId: first.o.items[0].id } }),
    2,
  );
});
await run(
  "06 repeated idempotency key / active duplicate prevention",
  async () => {
    const x = await makeOrder(1),
      key = randomUUID(),
      data = {
        orderId: x.o.id,
        eventKey: key,
        claimType: "DEFECT",
        resolution: "REFUND",
        reason: "Sản phẩm bị lỗi đường may",
        items: [{ orderItemId: x.o.items[0].id, quantity: 1 }],
      };
    const [a, b] = await Promise.all([
      ok(alice.post("returns", data)),
      ok(alice.post("returns", data)),
    ]);
    assert.equal(a.id, b.id);
    await failed(alice.post("returns", { ...data, eventKey: randomUUID() }));
    await failed(
      alice.post("returns", {
        ...data,
        reason: "Nội dung khác không dùng cùng key",
      }),
    );
  },
);
await run(
  "07 quantity exceeds purchased / foreign item / preference denied",
  async () => {
    await failed(
      alice.post("returns", {
        orderId: first.o.id,
        eventKey: randomUUID(),
        claimType: "DEFECT",
        resolution: "REFUND",
        reason: "Sản phẩm bị lỗi đường may",
        items: [{ orderItemId: first.o.items[0].id, quantity: 3 }],
      }),
    );
    await failed(
      alice.post("returns", {
        orderId: first.o.id,
        eventKey: randomUUID(),
        claimType: "SIZE_PREFERENCE",
        resolution: "EXCHANGE",
        reason: "Tôi thích đổi size khác",
        items: [{ orderItemId: first.o.items[0].id, quantity: 1 }],
      }),
    );
  },
);
await run(
  "08 admin review approval/rejection and released quantities",
  async () => {
    await state(r1.id, "UNDER_REVIEW");
    await state(r1.id, "APPROVED");
    await state(r2.id, "REJECTED");
    const r = await detail(r2.id);
    assert(r.released);
    r2 = await request(first, 1);
  },
);
await run("09 invalid state transition cannot change records", async () => {
  const before = await db.returnHistory.count({ where: { requestId: r2.id } });
  await failed(
    admin.post("admin/returns/status", {
      id: r2.id,
      status: "COMPLETED",
      reason: "Không được bỏ qua kiểm hàng",
    }),
  );
  assert.equal(
    await db.returnHistory.count({ where: { requestId: r2.id } }),
    before,
  );
});
await run("10 returned receipt does not restore stock", async () => {
  const before = (
    await db.productVariant.findUniqueOrThrow({ where: { id: first.v.id } })
  ).stock;
  await state(r1.id, "RECEIVED");
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: first.v.id } }))
      .stock,
    before,
  );
});
await run("11 authorized sellable inspection", async () => {
  await ok(inspect(r1.id, "SELLABLE"));
  assert.equal((await detail(r1.id)).status, "INSPECTED");
});
await run(
  "12 failed inspection preserves history and blocks refund",
  async () => {
    const x = await makeOrder(1),
      r = await request(x);
    await receive(r.id);
    await ok(inspect(r.id, "REJECTED"));
    assert.equal((await detail(r.id)).status, "INSPECTION_FAILED");
    await failed(
      admin.post("admin/returns/refund", {
        id: r.id,
        reason: "Không được hoàn tự động",
        refundShipping: false,
      }),
    );
    await state(r.id, "CLOSED");
  },
);
await run(
  "13 sellable restock exactly once under concurrent retries",
  async () => {
    const before = (
      await db.productVariant.findUniqueOrThrow({ where: { id: first.v.id } })
    ).stock;
    await Promise.all([
      ok(inspect(r1.id, "SELLABLE")),
      ok(inspect(r1.id, "SELLABLE")),
    ]);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: first.v.id } }))
        .stock,
      before,
    );
    assert.equal(
      await db.inventoryMovement.count({
        where: {
          reason: `RETURN_RESTOCK:${(await detail(r1.id)).items[0].id}`,
        },
      }),
      1,
    );
  },
);
await run(
  "14 damaged goods and review never enter sellable inventory",
  async () => {
    await receive(r2.id);
    const before = (
      await db.productVariant.findUniqueOrThrow({ where: { id: first.v.id } })
    ).stock;
    await ok(inspect(r2.id, "REVIEW"));
    assert.equal((await detail(r2.id)).status, "RECEIVED");
    await ok(inspect(r2.id, "DAMAGED"));
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: first.v.id } }))
        .stock,
      before,
    );
  },
);
let replacementId = "";
await run(
  "15 eligible defect exchange with different size and independent shipment",
  async () => {
    exchangeOrder = await makeOrder(1);
    exchangeReq = await request(exchangeOrder, 1, "EXCHANGE");
    await receive(exchangeReq.id);
    await ok(inspect(exchangeReq.id));
    const replacement = await db.productVariant.create({
      data: {
        productId: exchangeOrder.v.productId,
        sku: `REPLACE-${randomUUID()}`,
        size: "L",
        color: "Be",
        colorHex: "#dddddd",
        stock: 1,
      },
    });
    replacementId = replacement.id;
    const item = (await detail(exchangeReq.id)).items[0];
    await ok(
      admin.post("admin/returns/exchange", {
        id: exchangeReq.id,
        replacements: [{ itemId: item.id, variantId: replacement.id }],
        reason: "Lỗi đã xác nhận, khách đồng ý size thay thế",
      }),
    );
    const e = await db.exchangeItem.findUniqueOrThrow({
      where: { itemId: item.id },
    });
    for (const status of [
      "READY_FOR_PICKUP",
      "PICKED_UP",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ])
      await ok(
        admin.post("admin/returns/exchange-status", {
          id: exchangeReq.id,
          exchangeId: e.id,
          status,
          reason: "Giao thay thế mô phỏng",
        }),
      );
    assert.equal((await detail(exchangeReq.id)).status, "COMPLETED");
    assert.equal(
      await db.shipment.count({ where: { orderId: exchangeOrder.o.id } }),
      1,
    );
    assert.equal(
      (
        await db.orderItem.findUniqueOrThrow({
          where: { id: item.orderItemId },
        })
      ).size,
      exchangeOrder.v.size,
    );
  },
);
await run(
  "16 unavailable replacement and price difference rejected",
  async () => {
    const x = await makeOrder(1),
      r = await request(x, 1, "EXCHANGE");
    await receive(r.id);
    await ok(inspect(r.id));
    const i = (await detail(r.id)).items[0];
    await failed(
      admin.post("admin/returns/exchange", {
        id: r.id,
        replacements: [{ itemId: i.id, variantId: replacementId }],
        reason: "Không đủ tồn",
      }),
    );
    const diff = await db.productVariant.create({
      data: {
        productId: x.v.productId,
        sku: `DIFF-${randomUUID()}`,
        size: "XL",
        color: "Đen",
        colorHex: "#000000",
        stock: 1,
        priceOverride: 999999,
      },
    });
    await failed(
      admin.post("admin/returns/exchange", {
        id: r.id,
        replacements: [{ itemId: i.id, variantId: diff.id }],
        reason: "Không tự điều chỉnh giá",
      }),
    );
    assert.equal((await detail(r.id)).status, "INSPECTED");
  },
);
await run(
  "17 concurrent exchange allocation cannot oversell final unit",
  async () => {
    const a = await makeOrder(1),
      b = await makeOrder(1),
      ra = await request(a, 1, "EXCHANGE"),
      rb = await request(b, 1, "EXCHANGE");
    for (const r of [ra, rb]) {
      await receive(r.id);
      await ok(inspect(r.id));
    }
    await db.productVariant.update({
      where: { id: replacementId },
      data: { stock: 1 },
    });
    const calls = await Promise.all(
      [ra, rb].map(async (r) =>
        admin.post("admin/returns/exchange", {
          id: r.id,
          replacements: [
            {
              itemId: (await detail(r.id)).items[0].id,
              variantId: replacementId,
            },
          ],
          reason: "Cạnh tranh tồn SKU cuối",
        }),
      ),
    );
    assert.equal(calls.filter((r) => r.status === 200).length, 1);
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: replacementId },
        })
      ).stock,
      0,
    );
  },
);
await run(
  "18 server calculated net refund / discount and shipping",
  async () => {
    await ok(
      admin.post("admin/returns/refund", {
        id: r1.id,
        reason: "Hoàn phần hàng có lỗi",
        refundShipping: false,
      }),
    );
    const r = await detail(r1.id);
    assert.equal(r.refund!.amount, (first.o.subtotal - first.o.discount) / 2);
    assert(first.o.discount > 0);
    assert.equal(r.refund!.shippingAmount, 0);
    await failed(
      admin.post("admin/returns/status", {
        id: r1.id,
        status: "CLOSED",
        reason: "Không bỏ qua khoản hoàn đang chờ",
      }),
    );
    await failed(
      admin.post("admin/returns/refund", {
        id: r2.id,
        reason: "Không tự hoàn phí toàn đơn cho một phần",
        refundShipping: true,
      }),
    );
  },
);
await run(
  "19 duplicate and concurrent refund confirmations exactly once",
  async () => {
    await ok(
      admin.post("admin/returns/refund-status", {
        id: r1.id,
        status: "APPROVED",
        reason: "Đã kiểm tra số tiền mô phỏng",
      }),
    );
    await Promise.all(
      [1, 2].map(() =>
        ok(
          admin.post("admin/returns/refund-status", {
            id: r1.id,
            status: "SIMULATED_COMPLETED",
            reason: "Hoàn tất mô phỏng local",
          }),
        ),
      ),
    );
    assert.equal(await db.mockRefund.count({ where: { requestId: r1.id } }), 1);
    assert.equal(
      await db.auditLog.count({
        where: { targetId: r1.id, action: "MOCK_REFUND_SIMULATED_COMPLETED" },
      }),
      1,
    );
  },
);
await run(
  "20 unpaid amount / client amount injection cannot refund",
  async () => {
    const x = await makeOrder(1, false),
      r = await request(x);
    await receive(r.id);
    await ok(inspect(r.id));
    await failed(
      admin.post("admin/returns/refund", {
        id: r.id,
        reason: "Chưa thu không được hoàn",
        refundShipping: false,
      }),
    );
    await failed(
      admin.post("admin/returns/refund", {
        id: r2.id,
        reason: "Không tin số client",
        refundShipping: false,
        amount: 999999999,
      }),
    );
    assert.equal(await db.mockRefund.count({ where: { requestId: r.id } }), 0);
  },
);
await run(
  "21 non-admin cannot approve inspect exchange or refund",
  async () => {
    const raw = randomUUID(),
      u = await db.user.create({
        data: {
          name: "Staff QA",
          email: `p3-${raw}@qa.test`,
          phone: "",
          passwordHash: "unusable",
          role: "STAFF",
        },
      });
    await db.session.create({
      data: {
        userId: u.id,
        tokenHash: createHash("sha256").update(raw).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const staff = new Client();
    staff.cookies.set("hn_session", raw);
    for (const c of [alice, bob, guest, staff])
      for (const op of [
        "status",
        "inspect",
        "exchange",
        "refund",
        "refund-status",
      ])
        await failed(
          c.post(`admin/returns/${op}`, {
            id: r2.id,
            status: "APPROVED",
            reason: "Unauthorized",
          }),
        );
  },
);
await run(
  "22 COD remittance/reconciliation untouched, correction guard",
  async () => {
    const sh = await db.shipment.findUniqueOrThrow({
      where: { id: first.sh.id },
    });
    assert.equal(sh.collectedCOD, first.o.total);
    assert.equal(sh.remittedCOD, 0);
    assert.equal(sh.reconciliationStatus, "COLLECTED");
    assert.equal(
      await db.cODRemittance.count({ where: { shipmentId: sh.id } }),
      0,
    );
    const original = await db.cODCollection.findFirstOrThrow({
      where: { shipmentId: sh.id },
    });
    await failed(
      admin.post("admin/shipping/collection", {
        ...money(sh.id, -sh.collectedCOD),
        correctsId: original.id,
      }),
    );
  },
);
await run(
  "23 customer tracking / cross owner / internal evidence safe",
  async () => {
    const r = await ok(alice.req(`/api/returns/${r1.id}`));
    assert.equal(r.refund.status, "SIMULATED_COMPLETED");
    assert(!JSON.stringify(r).includes("Hồ sơ kiểm tra nội bộ"));
    assert(!JSON.stringify(r).includes("approvalActor"));
    assert.equal((await bob.req(`/api/returns/${r1.id}`)).status, 404);
    const html = await ok(alice.req(`/tai-khoan/don-hang/${first.o.id}`));
    assert(html.includes("Hoàn tiền"));
    assert(!html.includes("SIMULATED REFUND"));
    assert(html.includes("Đã hoàn tất"));
    assert(!html.includes("Chứng từ mô phỏng QA nội bộ"));
  },
);
await run("24 admin filters audit and stock movements visible", async () => {
  assert(
    (await ok(admin.req(`/admin/doi-tra/${r1.id}`))).includes("RETURN_RESTOCK"),
  );
  const html = await ok(admin.req(`/admin/doi-tra?q=${first.o.code}`));
  assert(html.includes(first.o.code));
  const r = await db.returnHistory.findMany({ where: { requestId: r1.id } });
  assert(r.every((h) => h.actorId && h.reason));
  assert((await db.auditLog.count({ where: { targetId: r1.id } })) > 5);
});
await run("25 Phase 1/2A regression in same isolated database", async () => {
  for (const name of ["order-phase1-results", "shipping-phase2a-results"]) {
    const r = JSON.parse(await readFile(`verification/${name}.json`, "utf8"));
    assert.equal(r.database, process.env.DATABASE_URL);
    assert(r.results.every((t: any) => t.status === "PASS"));
  }
});
await run("26 concurrent initial restock and claim quantity race", async () => {
  const x = await makeOrder(1);
  const data = {
    orderId: x.o.id,
    claimType: "DEFECT",
    resolution: "REFUND",
    reason: "Lỗi cần được kiểm tra và xác minh",
    items: [{ orderItemId: x.o.items[0].id, quantity: 1 }],
  };
  const races = await Promise.all(
    [1, 2].map(() =>
      alice.post("returns", { ...data, eventKey: randomUUID() }),
    ),
  );
  assert.equal(races.filter((r) => r.status === 200).length, 1);
  const r = races.find((r) => r.status === 200)!.body;
  await receive(r.id);
  const before = (
    await db.productVariant.findUniqueOrThrow({ where: { id: x.v.id } })
  ).stock;
  await Promise.all([
    ok(inspect(r.id, "SELLABLE")),
    ok(inspect(r.id, "SELLABLE")),
  ]);
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: x.v.id } }))
      .stock,
    before + 1,
  );
});
await run(
  "27 full defect refund includes shipping only when authorized",
  async () => {
    const x = await makeOrder(1),
      r = await request(x);
    await receive(r.id);
    await ok(inspect(r.id));
    await ok(
      admin.post("admin/returns/refund", {
        id: r.id,
        refundShipping: true,
        reason: "Khách đồng ý hoàn cả phí giao cho toàn bộ đơn lỗi",
      }),
    );
    const f = (await detail(r.id)).refund!;
    assert.equal(f.amount, x.o.total);
    assert.equal(f.shippingAmount, x.o.shipping);
    await ok(
      admin.post("admin/returns/refund-status", {
        id: r.id,
        status: "CANCELED",
        reason: "Dừng khoản hoàn mô phỏng theo thống nhất",
      }),
    );
    assert.equal((await detail(r.id)).refund!.status, "CANCELED");
    assert.equal((await detail(r.id)).status, "CLOSED");
  },
);
await run("28 invalid image never creates request or public file", async () => {
  const x = await makeOrder(1);
  const before = await db.returnRequest.count({ where: { orderId: x.o.id } });
  await failed(
    alice.post("returns", {
      orderId: x.o.id,
      eventKey: randomUUID(),
      claimType: "DEFECT",
      resolution: "REFUND",
      reason: "Sản phẩm cần kiểm tra lỗi",
      items: [{ orderItemId: x.o.items[0].id, quantity: 1 }],
      evidence: [{ data: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }],
    }),
  );
  assert.equal(
    await db.returnRequest.count({ where: { orderId: x.o.id } }),
    before,
  );
});
const browserOrder = await makeOrder(1);
await writeFile(
  "verification/returns-phase3-results.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      database: process.env.DATABASE_URL,
      mode: "LOCAL_DEMO",
      results,
    },
    null,
    2,
  ),
);
await writeFile(
  "verification/returns-browser-fixture.json",
  JSON.stringify({
    database: process.env.DATABASE_URL,
    orderId: first.o.id,
    browserOrderId: browserOrder.o.id,
    returnId: r2.id,
    exchangeReturnId: exchangeReq.id,
    users: fixture.users,
  }),
  { mode: 0o600 },
);
await db.$disconnect();
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
