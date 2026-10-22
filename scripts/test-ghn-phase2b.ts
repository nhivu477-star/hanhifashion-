import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
if (
  !process.env.DATABASE_URL?.includes("phase1-orders") ||
  process.env.GHN_TEST_FIXTURES !== "1"
)
  throw Error("Isolated GHN fixture tests only");
const db = new PrismaClient();
const fixture = JSON.parse(
  await readFile("verification/phase1-fixtures.json", "utf8"),
);
const base = "http://127.0.0.1:3101";
const file = "verification/ghn-test-controls.json";
type State = {
  orders: Record<
    string,
    {
      code: string;
      clientRef: string;
      status: string;
      time: string;
      cod: number;
    }
  >;
  scenario?: string;
  createCalls?: number;
  cancelCalls?: number;
};
await writeFile(file, JSON.stringify({ orders: {} }));
const state = async (): Promise<State> =>
  JSON.parse(await readFile(file, "utf8"));
async function edit(fn: (v: State) => void) {
  const v = await state();
  fn(v);
  await writeFile(file, JSON.stringify(v));
}
class Client {
  cookies = new Map<string, string>();
  constructor(name?: string) {
    if (name)
      this.cookies.set(
        "hn_session",
        fixture.users.find((u: any) => u.name === name).token,
      );
  }
  async req(
    path: string,
    data?: unknown,
    headers: Record<string, string> = {},
  ) {
    const r = await fetch(base + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...headers,
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
    return { status: r.status, body };
  }
  post(a: string, data: unknown) {
    return this.req("/api/" + a, data);
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
    results.push({ test, status: "FAIL", error: String(e).slice(0, 3000) });
    console.log("FAIL", test, String(e).slice(0, 300));
  }
}
const customer = {
  name: "Khách GHN QA",
  phone: "0912345678",
  email: "ghn@phase2b.test",
  province: "Hồ Chí Minh",
  ward: "Phường Vũng Tàu",
  street: "123 Đường kiểm thử",
  details: "",
  notes: "",
};
async function draft(index = 18, overrides = {}, recipient = {}) {
  const c = new Client("alice"),
    v = fixture.fixtures[index];
  assert.equal(
    (await c.post("cart", { variantId: v.variantId, quantity: 1 })).status,
    200,
  );
  const key = randomUUID();
  const r = await c.post("checkout", {
    ...customer,
    ...recipient,
    idempotencyKey: key,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const o = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
  });
  for (const status of ["CONFIRMED", "PROCESSING"])
    assert.equal(
      (await admin.post("admin/order", { id: o.id, status })).status,
      200,
    );
  const input = {
    orderId: o.id,
    provider: "GHN_STAGING",
    shippingFee: 0,
    parcelDescription: "Một thiết kế kiểm thử GHN",
    weightGrams: 600,
    parcelCount: 1,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 8,
    insuredValue: 0,
    ...overrides,
  };
  const sh = await admin.post("admin/shipping/create", input);
  return { o, c, v, sh };
}
async function get(id: string) {
  return db.shipment.findUniqueOrThrow({ where: { id } });
}
async function submit(id: string) {
  const r = await admin.post("admin/ghn/submit", { id });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return get(id);
}
async function syncState(id: string, status: string) {
  const s = await get(id);
  await edit((v) => {
    v.scenario = undefined;
    v.orders[s.providerClientRef!].status = status;
    v.orders[s.providerClientRef!].time = new Date().toISOString();
  });
  return admin.post("admin/ghn/sync", { id });
}
async function webhook(
  id: string,
  status: string,
  time = new Date().toISOString(),
  secret = process.env.GHN_STAGING_WEBHOOK_SECRET,
) {
  const s = await get(id);
  const event = {
    OrderCode: s.providerCode,
    ClientOrderCode: s.providerClientRef,
    ShopID: 196560,
    Status: status,
    Type: "switch_status",
    Time: time,
    CODAmount: s.expectedCOD,
    ReasonCode: status === "delivery_fail" ? "GHN_TEST_REASON" : "",
  };
  return admin.req(
    "/api/shipping/ghn/webhook",
    event,
    secret ? { "x-ghn-webhook-token": secret } : {},
  );
}
let x: Awaited<ReturnType<typeof draft>>,
  id = "",
  uncertainId = "",
  cancelId = "";
await run("01 documented preview quote, no total mutation", async () => {
  x = await draft();
  assert.equal(x.sh.status, 200);
  id = x.sh.body.id;
  const r = await admin.post("admin/ghn/fee", { id });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.total, 20900);
  assert.equal(r.body.verification, "MOCK_VERIFIED");
  assert.equal(
    (await db.order.findUniqueOrThrow({ where: { id: x.o.id } })).total,
    x.o.total,
  );
});
await run("02 address names must match current 2-level catalogue", async () => {
  const bad = await draft(19, {}, { ward: "Phường không tồn tại" });
  assert.equal(bad.sh.status, 200);
  const r = await admin.post("admin/ghn/fee", { id: bad.sh.body.id });
  assert.notEqual(r.status, 200);
  assert(String(r.body.error).includes("INVALID_WARD"));
});
await run("03 invalid dimensions / units rejected", async () => {
  const bad = await draft(20, { lengthCm: 0 });
  assert.notEqual(bad.sh.status, 200);
  assert.equal(await db.shipment.count({ where: { orderId: bad.o.id } }), 0);
});
await run(
  "04 fixture creation persists external identity separately",
  async () => {
    const s = await submit(id);
    assert(s.providerCode?.startsWith("TEST-GHN-"));
    assert.equal(s.carrierReference, s.providerCode);
    assert(s.providerSubmittedAt);
    assert(s.providerCorrelationId);
    assert.equal(s.shippingFee, 20900);
    assert.equal(s.providerVerification, "MOCK_VERIFIED");
    assert(s.reference.startsWith("HN-SHIP-"));
  },
);
await run(
  "05 concurrent duplicate submission makes one external order",
  async () => {
    const before = (await state()).createCalls;
    const r = await Promise.all(
      [1, 2].map(() => admin.post("admin/ghn/submit", { id })),
    );
    assert(r.every((x) => x.status === 200));
    assert.equal((await state()).createCalls, before);
    assert.equal(Object.keys((await state()).orders).length, 1);
  },
);
await run(
  "06 uncertain create timeout reconciles by client reference",
  async () => {
    const a = await draft(21);
    uncertainId = a.sh.body.id;
    await edit((v) => {
      v.scenario = "create-timeout-recover";
    });
    const before = (await state()).createCalls ?? 0;
    const s = await submit(uncertainId);
    assert(s.providerCode);
    assert.equal((await state()).createCalls, before + 1);
    assert.equal(s.providerSyncStatus, "REGISTERED");
    await edit((v) => {
      v.scenario = undefined;
    });
  },
);
await run("07 tracking normalized and repeated sync idempotent", async () => {
  assert.equal((await syncState(id, "ready_to_pick")).status, 200);
  const s = await get(id);
  assert.equal(s.status, "READY_FOR_PICKUP");
  const before = await db.shipmentEvent.count({ where: { shipmentId: id } });
  assert.equal(
    (await admin.post("admin/ghn/sync", { id })).body.disposition,
    "DUPLICATE",
  );
  assert.equal(
    await db.shipmentEvent.count({ where: { shipmentId: id } }),
    before,
  );
});
await run(
  "08 forward status gaps use audited internal transitions",
  async () => {
    assert.equal((await syncState(id, "delivering")).status, 200);
    assert.equal((await get(id)).status, "OUT_FOR_DELIVERY");
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: x.o.id } })).status,
      "SHIPPING",
    );
    assert(
      (await db.shipmentEvent.count({
        where: { shipmentId: id, source: "GHN_INFERRED" },
      })) > 0,
    );
  },
);
await run("09 authenticated webhook replay deduplicated", async () => {
  const time = new Date().toISOString();
  const a = await webhook(id, "delivery_fail", time);
  assert.equal(a.status, 200, JSON.stringify(a.body));
  const before = await db.shipmentEvent.count({ where: { shipmentId: id } });
  const b = await webhook(id, "delivery_fail", time);
  assert.equal(b.body.disposition, "DUPLICATE");
  assert.equal(
    await db.shipmentEvent.count({ where: { shipmentId: id } }),
    before,
  );
});
await run("10 out-of-order cannot regress shipment", async () => {
  const r = await webhook(
    id,
    "ready_to_pick",
    new Date(Date.now() - 120000).toISOString(),
  );
  assert.equal(r.body.disposition, "OUT_OF_ORDER");
  assert.equal((await get(id)).status, "DELIVERY_FAILED");
});
await run("11 missing/invalid webhook auth cannot mutate", async () => {
  const before = await db.shipmentEvent.count({ where: { shipmentId: id } });
  assert.equal(
    (await webhook(id, "delivered", undefined, "wrong")).status,
    401,
  );
  assert.equal(
    await db.shipmentEvent.count({ where: { shipmentId: id } }),
    before,
  );
});
await run(
  "12 carrier cancellation acknowledged and restocks once",
  async () => {
    const a = await draft(22);
    cancelId = a.sh.body.id;
    await submit(cancelId);
    const before = (
      await db.productVariant.findUniqueOrThrow({
        where: { id: a.v.variantId },
      })
    ).stock;
    const r = await admin.post("admin/ghn/cancel", {
      id: cancelId,
      reason: "Khách hủy đơn kiểm thử staging",
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await get(cancelId)).status, "CANCELED");
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: a.v.variantId },
        })
      ).stock,
      before + 1,
    );
    await admin.post("admin/ghn/cancel", { id: cancelId, reason: "Lặp hủy" });
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: a.v.variantId },
        })
      ).stock,
      before + 1,
    );
  },
);
await run("13 carrier rejection never cancels local order", async () => {
  const a = await draft(23);
  cancelId = a.sh.body.id;
  await submit(cancelId);
  await edit((v) => {
    v.scenario = "cancel-rejected";
  });
  assert.notEqual(
    (
      await admin.post("admin/ghn/cancel", {
        id: cancelId,
        reason: "Kiểm thử từ chối",
      })
    ).status,
    200,
  );
  assert.equal((await get(cancelId)).status, "PENDING");
  assert.equal((await get(cancelId)).providerSyncStatus, "REGISTERED");
  await edit((v) => {
    v.scenario = undefined;
  });
});
await run(
  "14 timeout stays unknown and requires lookup before retry",
  async () => {
    await edit((v) => {
      v.scenario = "cancel-timeout";
    });
    assert.notEqual(
      (
        await admin.post("admin/ghn/cancel", {
          id: cancelId,
          reason: "Kiểm thử timeout",
        })
      ).status,
      200,
    );
    assert.equal((await get(cancelId)).providerSyncStatus, "CANCEL_UNKNOWN");
    await edit((v) => {
      v.scenario = undefined;
    });
    assert.equal(
      (await admin.post("admin/ghn/sync", { id: cancelId })).status,
      200,
    );
    assert.equal((await get(cancelId)).status, "CANCELED");
  },
);
await run("15 failed delivery exception recorded without restock", async () => {
  assert.equal((await get(id)).status, "DELIVERY_FAILED");
  assert.equal(
    await db.deliveryAttempt.count({ where: { shipmentId: id } }),
    1,
  );
  assert.equal(
    (
      await db.productVariant.findUniqueOrThrow({
        where: { id: x.v.variantId },
      })
    ).stock,
    9,
  );
});
await run("16 provider return is not physical stock approval", async () => {
  assert.equal((await syncState(id, "returned")).status, 200);
  assert.equal((await get(id)).status, "RETURNED");
  assert.equal(
    (
      await db.productVariant.findUniqueOrThrow({
        where: { id: x.v.variantId },
      })
    ).stock,
    9,
  );
  const req = {
    id: x.o.id,
    status: "CANCELLED",
    reason: "Đã kiểm tra hàng thực tế quay về",
  };
  for (const _ of [1, 2])
    assert.equal((await admin.post("admin/order", req)).status, 200);
  assert.equal(
    (
      await db.productVariant.findUniqueOrThrow({
        where: { id: x.v.variantId },
      })
    ).stock,
    10,
  );
});
await run(
  "17 delivery/COD webhook never creates financial ledger",
  async () => {
    assert.equal((await syncState(uncertainId, "delivered")).status, 200);
    const s = await get(uncertainId);
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: s.orderId } }))
        .paymentStatus,
      "UNPAID",
    );
    assert.equal(
      await db.cODCollection.count({ where: { shipmentId: uncertainId } }),
      0,
    );
    assert.equal(
      await db.cODRemittance.count({ where: { shipmentId: uncertainId } }),
      0,
    );
    assert.equal(s.reconciliationStatus, "PENDING");
  },
);
await run("18 mismatched provider COD quarantined", async () => {
  const s = await get(uncertainId);
  await edit((v) => {
    v.orders[s.providerClientRef!].cod = 1;
    v.orders[s.providerClientRef!].time = new Date().toISOString();
  });
  const r = await admin.post("admin/ghn/sync", { id: uncertainId });
  assert.equal(r.body.disposition, "COD_DISCREPANCY");
  assert.equal((await get(uncertainId)).reconciliationStatus, "DISPUTED");
  assert.equal(
    await db.cODCollection.count({ where: { shipmentId: uncertainId } }),
    0,
  );
});
await run("19 customer-safe stage tracking and ownership", async () => {
  const r = await x.c.req(`/tai-khoan/don-hang/${x.o.id}`);
  assert(r.body.includes("GHN — môi trường staging"));
  assert(r.body.includes("Mô phỏng local"));
  assert(!r.body.includes("providerRequestDigest"));
  const denied = await new Client("bob").req(`/tai-khoan/don-hang/${x.o.id}`);
  assert(denied.body.includes("Trang chưa được tìm thấy"));
  assert(!denied.body.includes((await get(id)).providerCode!));
});
await run("20 non-admin cannot submit or cancel GHN", async () => {
  for (const c of [new Client(), new Client("bob")])
    for (const op of ["fee", "submit", "sync", "cancel"])
      assert.notEqual(
        (await c.post(`admin/ghn/${op}`, { id, reason: "unauthorized" }))
          .status,
        200,
      );
});
await run("21 manual shipping regression stays unchanged", async () => {
  const r = JSON.parse(
    await readFile("verification/shipping-phase2a-results.json", "utf8"),
  );
  assert.equal(r.database, process.env.DATABASE_URL);
  assert(r.results.every((t: any) => t.status === "PASS"));
  assert.equal(r.results.length, 18);
});
await run(
  "22 full Phase 1/2A regression reports belong to same isolated run",
  async () => {
    const r = JSON.parse(
      await readFile("verification/order-phase1-results.json", "utf8"),
    );
    assert.equal(r.database, process.env.DATABASE_URL);
    assert.equal(r.results.length, 17);
    assert(r.results.every((t: any) => t.status === "PASS"));
    assert.equal(await db.payment.count({ where: { orderId: x.o.id } }), 1);
  },
);
await writeFile(
  "verification/ghn-phase2b-results.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      database: process.env.DATABASE_URL,
      verification: "MOCK_VERIFIED",
      realStaging: "UNVERIFIED",
      results,
    },
    null,
    2,
  ),
);
await db.$disconnect();
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
