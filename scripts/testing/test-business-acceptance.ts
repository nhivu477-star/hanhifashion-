import { sampleChart } from "../../src/lib/sizing";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { writeFile, readdir, readFile, unlink, stat } from "node:fs/promises";
import { hash, compare } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { cancelOrderItems } from "../../src/lib/partial-cancellation";
import { nextProductSku, productSkuPrefix } from "../../src/lib/product-sku";
const database = process.env.DATABASE_URL ?? "";
if (!/^file:\.\/business-tests-[\w-]+\.db$/.test(database))
  throw Error("Isolated business acceptance DB required");
const db = new PrismaClient(),
  base = "http://127.0.0.1:3101";
const results: { test: string; status: "PASS" | "FAIL"; error?: string }[] = [];
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
class Client {
  constructor(
    public id: string,
    public token: string,
  ) {}
  async req(path: string, data?: unknown) {
    const response = await fetch(base + path, {
      method: data === undefined ? "GET" : "POST",
      redirect: "manual",
      headers: {
        cookie: `hn_session=${this.token}; hn_analytics=off`,
        "x-forwarded-for": "acceptance-" + this.id,
        ...(data === undefined
          ? {}
          : { origin: base, "Content-Type": "application/json" }),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    let body: any = bytes.toString();
    try {
      body = JSON.parse(body);
    } catch {}
    return { status: response.status, body, bytes, headers: response.headers };
  }
  post(action: string, data: unknown) {
    return this.req("/api/" + action, data);
  }
}
async function actor(role = "CUSTOMER") {
  const id = randomUUID(),
    token = randomBytes(32).toString("hex");
  await db.user.create({
    data: {
      id,
      role,
      name: "Business acceptance",
      email: id + "@acceptance.local",
      phone: "0912345678",
      passwordHash: "not-a-login-credential",
    },
  });
  await db.session.create({
    data: {
      userId: id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return new Client(id, token);
}
const admin = await actor("ADMIN"),
  seller = await actor("SELLER"),
  buyer = await actor(),
  other = await actor();
const category = await db.category.findUniqueOrThrow({
  where: { slug: "trang-phuc" },
});
const skuPrefix = productSkuPrefix(category.slug);
const productSku = nextProductSku(
  skuPrefix,
  await db.product.findMany({
    where: { sku: { startsWith: skuPrefix } },
    select: { sku: true },
  }),
);
const product = await db.product.create({
  data: {
    name: "Acceptance product",
    slug: "acceptance-" + randomUUID(),
    sku: productSku,
    description: "Business acceptance fixture only",
    categoryId: category.id,
    material: "Cotton",
    style: "Test",
    fit: "regular",
    occasion: "Test",
    searchText: "acceptance",
    price: 100001,
    images: { create: { url: category.image, alt: "Test" } },
    variants: {
      create: {
        sku: `${productSku}-M-WHITE`,
        size: "M",
        color: "Trắng",
        colorHex: "#ffffff",
        stock: 1000,
      },
    },
  },
  include: { variants: true },
});
const variant = product.variants[0];
const address = {
  name: "Khách kiểm thử",
  phone: "0912345678",
  email: "test@acceptance.local",
  province: "Hưng Yên",
  ward: "Phường thử nghiệm",
  street: "123 Kiểm thử",
  details: "",
  notes: "Local isolated",
  countryCode: "VN",
};
async function ok(p: ReturnType<Client["post"]>) {
  const r = await p;
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
async function rejected(p: ReturnType<Client["post"]>) {
  const r = await p;
  assert(r.status >= 400 && r.status < 500, JSON.stringify(r.body));
  return r;
}
async function add(c: Client, q: number, extra = {}) {
  return ok(c.post("cart", { variantId: variant.id, quantity: q, ...extra }));
}
async function place(c = buyer, q = 3, extra = {}) {
  await add(c, q);
  const idempotencyKey = randomUUID();
  await ok(c.post("checkout", { ...address, idempotencyKey, ...extra }));
  return db.order.findUniqueOrThrow({
    where: { idempotencyKey },
    include: { items: true, payments: true },
  });
}
const dto = {
  ...product,
  id: product.id,
  image: category.image,
  gallery: "",
  salePrice: "",
  active: true,
  featured: false,
  isNew: false,
};
const change = (order: any, quantity = 1, extra = {}) => ({
  id: order.id,
  eventKey: randomUUID(),
  reason: "Hủy phần hàng theo yêu cầu",
  items: [{ id: order.items[0].id, quantity }],
  ...extra,
});

await run(
  "BA-CART-01 analytics opt-out duplicate increment exactly once",
  async () => {
    const key = randomUUID();
    await add(buyer, 1, { increment: true, eventKey: key });
    await add(buyer, 1, { increment: true, eventKey: key });
    const cart = await db.cart.findUniqueOrThrow({
      where: { userId: buyer.id },
      include: { items: true },
    });
    assert.equal(cart.items[0].quantity, 1);
    assert.equal(
      await db.analyticsEvent.count({ where: { eventKey: key + ":success" } }),
      0,
    );
  },
);
await run("BA-CART-02 reused key different payload rejected", async () => {
  const key = randomUUID();
  await add(buyer, 2, { eventKey: key });
  await rejected(
    buyer.post("cart", { variantId: variant.id, quantity: 3, eventKey: key }),
  );
});
await run(
  "BA-CART-03 concurrent duplicate adds stock-safe exactly once",
  async () => {
    const c = await actor(),
      key = randomUUID();
    const responses = await Promise.all(
      [1, 2, 3].map(() =>
        c.post("cart", {
          variantId: variant.id,
          quantity: 1,
          increment: true,
          eventKey: key,
        }),
      ),
    );
    assert(responses.every((r) => r.status === 200));
    const cart = await db.cart.findUniqueOrThrow({
      where: { userId: c.id },
      include: { items: true },
    });
    assert.equal(cart.items[0].quantity, 1);
  },
);
await run(
  "BA-CART-04 total per-SKU limit cannot be bypassed by increment",
  async () => {
    await add(buyer, 99);
    await rejected(
      buyer.post("cart", {
        variantId: variant.id,
        quantity: 1,
        increment: true,
      }),
    );
  },
);
await run("BA-CART-05 inactive category cannot add or checkout", async () => {
  await add(buyer, 1);
  await db.category.update({
    where: { id: category.id },
    data: { active: false },
  });
  try {
    await rejected(buyer.post("cart", { variantId: variant.id, quantity: 1 }));
    await rejected(
      buyer.post("checkout", { ...address, idempotencyKey: randomUUID() }),
    );
  } finally {
    await db.category.update({
      where: { id: category.id },
      data: { active: true },
    });
  }
});
await run(
  "BA-CHECKOUT-01 changed payload with committed key rejected",
  async () => {
    const order = await place();
    await rejected(
      buyer.post("checkout", {
        ...address,
        street: "Khác địa chỉ",
        idempotencyKey: order.idempotencyKey,
      }),
    );
    await ok(
      buyer.post("checkout", {
        ...address,
        idempotencyKey: order.idempotencyKey,
      }),
    );
    assert.equal(
      await db.order.count({ where: { idempotencyKey: order.idempotencyKey } }),
      1,
    );
  },
);
await run(
  "BA-SETTINGS-01 invalid late field leaves all settings unchanged",
  async () => {
    const before = await db.storeSetting.findUnique({
      where: { key: "announcement" },
    });
    await rejected(
      admin.post("admin/settings", {
        announcement: "must roll back",
        contactEmail: "invalid",
      }),
    );
    assert.deepEqual(
      await db.storeSetting.findUnique({ where: { key: "announcement" } }),
      before,
    );
  },
);
async function failAudit(action: string, fn: () => Promise<void>) {
  assert(/^[A-Z_]+$/.test(action));
  await db.$executeRawUnsafe(
    `CREATE TRIGGER acceptance_audit_failure BEFORE INSERT ON AuditLog WHEN NEW.action='${action}' BEGIN SELECT RAISE(ABORT, 'acceptance injected failure'); END`,
  );
  try {
    await fn();
  } finally {
    await db.$executeRawUnsafe("DROP TRIGGER acceptance_audit_failure");
  }
}
await run(
  "BA-SETTINGS-02 audit failure rolls back complete settings transaction",
  async () => {
    const before = await db.storeSetting.findUnique({
      where: { key: "announcement" },
    });
    await failAudit("SETTINGS", () =>
      rejected(
        admin.post("admin/settings", { announcement: "must roll back" }),
      ).then(() => {}),
    );
    assert.deepEqual(
      await db.storeSetting.findUnique({ where: { key: "announcement" } }),
      before,
    );
  },
);
await run(
  "BA-CART-06 failed receipt rolls back cart and retry recovers",
  async () => {
    const c = await actor(),
      key = randomUUID();
    await add(c, 1);
    await failAudit("CART_UPDATED", () =>
      rejected(
        c.post("cart", {
          variantId: variant.id,
          quantity: 1,
          increment: true,
          eventKey: key,
        }),
      ).then(() => {}),
    );
    let cart = await db.cart.findUniqueOrThrow({
      where: { userId: c.id },
      include: { items: true },
    });
    assert.equal(cart.items[0].quantity, 1);
    await add(c, 1, { increment: true, eventKey: key });
    cart = await db.cart.findUniqueOrThrow({
      where: { userId: c.id },
      include: { items: true },
    });
    assert.equal(cart.items[0].quantity, 2);
  },
);
await run(
  "BA-PRODUCT-01 product and gallery rollback if audit fails",
  async () => {
    const before = await db.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { images: true },
    });
    await failAudit("PRODUCT", () =>
      rejected(
        admin.post("admin/product", { ...dto, name: "must roll back" }),
      ).then(() => {}),
    );
    assert.deepEqual(
      await db.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { images: true },
      }),
      before,
    );
  },
);
await run(
  "BA-PRODUCT-02 soft archive preserves historical order items",
  async () => {
    const order = await place();
    const old = await db.orderItem.findMany({ where: { orderId: order.id } });
    await ok(admin.post("admin/product", { ...dto, active: false }));
    assert.deepEqual(
      await db.orderItem.findMany({ where: { orderId: order.id } }),
      old,
    );
    await rejected(buyer.post("cart", { variantId: variant.id, quantity: 1 }));
    await ok(admin.post("admin/product", dto));
  },
);
const promo = {
  code: "BA_" + randomUUID().replaceAll("-", ""),
  type: "FIXED",
  value: 1,
  minimum: 0,
  maximum: null,
  startsAt: new Date(Date.now() - 3600000).toISOString(),
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  usageLimit: 10,
  active: true,
};
await run("BA-PROMO-01 start date enforced in quote and checkout", async () => {
  const data = {
    ...promo,
    code: "FUTURE_" + randomUUID().slice(0, 8),
    startsAt: new Date(Date.now() + 1800000).toISOString(),
  };
  await ok(admin.post("admin/coupon", data));
  await add(buyer, 2);
  await rejected(buyer.post("quote", { coupon: data.code }));
  await rejected(
    buyer.post("checkout", {
      ...address,
      coupon: data.code,
      idempotencyKey: randomUUID(),
    }),
  );
});
await run(
  "BA-PROMO-02 inverted range and expired voucher rejected",
  async () => {
    await rejected(
      admin.post("admin/coupon", {
        ...promo,
        startsAt: "2026-10-20",
        expiresAt: "2026-10-19",
      }),
    );
    const expired = {
      ...promo,
      code: "EXPIRED_" + randomUUID().slice(0, 8),
      startsAt: null,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    await ok(admin.post("admin/coupon", expired));
    await rejected(buyer.post("quote", { coupon: expired.code }));
  },
);
await run(
  "BA-PROMO-03 final redemption concurrent buyers exactly one succeeds",
  async () => {
    const data = {
      ...promo,
      code: "LAST_" + randomUUID().slice(0, 8),
      usageLimit: 1,
    };
    await ok(admin.post("admin/coupon", data));
    const clients = [await actor(), await actor()];
    await Promise.all(clients.map((c) => add(c, 1)));
    const r = await Promise.all(
      clients.map((c) =>
        c.post("checkout", {
          ...address,
          coupon: data.code,
          idempotencyKey: randomUUID(),
        }),
      ),
    );
    assert.equal(r.filter((x) => x.status === 200).length, 1);
    assert.equal(
      (
        await db.coupon.findUniqueOrThrow({
          where: { code: data.code.toUpperCase() },
        })
      ).used,
      1,
    );
  },
);
await run(
  "BA-PROMO-04 usage limit cannot be reduced below redeemed count",
  async () => {
    const c = await db.coupon.create({
      data: {
        ...promo,
        code: "USED_" + randomUUID().slice(0, 8),
        startsAt: new Date(promo.startsAt),
        expiresAt: new Date(promo.expiresAt),
        used: 2,
      },
    });
    await rejected(
      admin.post("admin/coupon", {
        ...promo,
        id: c.id,
        code: c.code,
        usageLimit: 1,
      }),
    );
  },
);
await ok(admin.post("admin/coupon", promo));
await run(
  "BA-POLICY-01 partial cancellation disabled without owner-approved policy",
  async () => {
    const order = await place();
    await rejected(buyer.post("order/cancel-items", change(order)));
  },
);
// Isolated proposal fixture only: not enabled on the store database.
await db.storeSetting.upsert({
  where: { key: "business.partialCancellationPolicy" },
  create: {
    key: "business.partialCancellationPolicy",
    value: "NET_SNAPSHOT_V1_APPROVED",
  },
  update: { value: "NET_SNAPSHOT_V1_APPROVED" },
});
await run(
  "BA-PARTIAL-01 prorated discount payment inventory and audit match",
  async () => {
    const order = await place(buyer, 3, { coupon: promo.code }),
      before = await db.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      }),
      d = change(order);
    await ok(buyer.post("order/cancel-items", d));
    const after = await db.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: { include: { analytics: true } }, payments: true },
    });
    assert.equal(after.items[0].quantity, 2);
    assert.equal(after.items[0].originalQuantity, 3);
    assert.equal(after.items[0].unitPrice, order.items[0].unitPrice);
    const expected = Number(BigInt(order.subtotal - order.discount) / 3n);
    assert.equal(after.total, order.total - expected);
    assert.equal(after.payments[0].amount, after.total);
    assert.equal(
      after.items[0].analytics?.netAmount,
      after.subtotal - after.discount,
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before.stock + 1,
    );
    assert.equal(
      await db.auditLog.count({
        where: { action: "ORDER_PARTIAL_CANCELLATION", targetId: order.id },
      }),
      1,
    );
  },
);
await run("BA-PARTIAL-02 concurrent same key restores stock once", async () => {
  const order = await place(),
    before = (
      await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
    ).stock,
    d = change(order);
  const result = await Promise.all([
    buyer.post("order/cancel-items", d),
    buyer.post("order/cancel-items", d),
  ]);
  assert(result.every((r) => r.status === 200));
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
      .stock,
    before + 1,
  );
  assert.equal(
    await db.inventoryMovement.count({
      where: { orderId: order.id, delta: 1 },
    }),
    1,
  );
});
await run(
  "BA-PARTIAL-03 quantity race cannot consume final remaining unit",
  async () => {
    const order = await place(buyer, 2),
      before = (
        await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
      ).stock;
    const result = await Promise.all([
      buyer.post("order/cancel-items", change(order)),
      buyer.post("order/cancel-items", change(order)),
    ]);
    assert.equal(result.filter((r) => r.status === 200).length, 1);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before + 1,
    );
    assert.equal(
      (
        await db.orderItem.findUniqueOrThrow({
          where: { id: order.items[0].id },
        })
      ).quantity,
      1,
    );
  },
);
await run("BA-PARTIAL-04 cross-customer and public-admin denial", async () => {
  const order = await place(),
    d = change(order);
  await rejected(other.post("order/cancel-items", d));
  assert.equal((await buyer.post("admin/order-items-cancel", d)).status, 403);
});
await run(
  "BA-PARTIAL-05 zero excess duplicate foreign lines rejected",
  async () => {
    const order = await place();
    for (const items of [
      [{ id: order.items[0].id, quantity: 0 }],
      [{ id: order.items[0].id, quantity: 4 }],
      [
        { id: order.items[0].id, quantity: 1 },
        { id: order.items[0].id, quantity: 1 },
      ],
      [{ id: "foreign", quantity: 1 }],
    ])
      await rejected(
        buyer.post("order/cancel-items", change(order, 1, { items })),
      );
  },
);
await run(
  "BA-PARTIAL-06 prepared paid or shipment-bound orders rejected",
  async () => {
    for (const state of ["PROCESSING", "PAID", "SHIPMENT"]) {
      const order = await place();
      if (state === "PAID")
        await db.order.update({
          where: { id: order.id },
          data: { paymentStatus: "PAID" },
        });
      else {
        await ok(
          admin.post("admin/order", { id: order.id, status: "CONFIRMED" }),
        );
        if (state === "PROCESSING")
          await ok(
            admin.post("admin/order", { id: order.id, status: "PROCESSING" }),
          );
        else {
          await ok(
            admin.post("admin/order", { id: order.id, status: "PROCESSING" }),
          );
          await ok(
            admin.post("admin/order/pack", {
              id: order.id,
              eventKey: randomUUID(),
              kind: "PACK",
              reason: "Đã kiểm tra đủ hàng",
              items: order.items.map((i) => ({
                id: i.id,
                quantity: i.quantity,
                checked: true,
              })),
            }),
          );
          await ok(
            admin.post("admin/shipping/create", {
              orderId: order.id,
              provider: "LOCAL_MANUAL",
              shippingFee: 0,
              parcelDescription: "Kiện kiểm thử",
              weightGrams: 500,
              parcelCount: 1,
            }),
          );
        }
      }
      await rejected(buyer.post("order/cancel-items", change(order)));
    }
  },
);
await run(
  "BA-PARTIAL-07 full cancel after partial restores only remainder",
  async () => {
    const before = (
        await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
      ).stock,
      order = await place();
    await ok(buyer.post("order/cancel-items", change(order)));
    await ok(
      buyer.post("order/cancel", { id: order.id, reason: "Hủy phần còn lại" }),
    );
    await ok(
      buyer.post("order/cancel", { id: order.id, reason: "Hủy phần còn lại" }),
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before,
    );
  },
);
await run(
  "BA-PARTIAL-08 audit failure rolls back stock money quantity and retry",
  async () => {
    const order = await place(),
      before = await db.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      }),
      d = change(order);
    await failAudit("ORDER_PARTIAL_CANCELLATION", () =>
      rejected(buyer.post("order/cancel-items", d)).then(() => {}),
    );
    assert.deepEqual(
      await db.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true, payments: true },
      }),
      order,
    );
    assert.deepEqual(
      await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }),
      before,
    );
    await ok(buyer.post("order/cancel-items", d));
  },
);
await run(
  "BA-PARTIAL-09 changed payload key rejected no extra stock",
  async () => {
    const order = await place(),
      d = change(order);
    await ok(buyer.post("order/cancel-items", d));
    await rejected(
      buyer.post("order/cancel-items", { ...d, reason: "Khác nội dung" }),
    );
  },
);
await run(
  "BA-CUSTOMER-01 profile own purchase history and authenticated support link",
  async () => {
    const c = await actor();
    await ok(
      c.post("contact", {
        name: "Acceptance",
        email: "different@acceptance.local",
        subject: "Hỗ trợ",
        message: "Yêu cầu hỗ trợ được liên kết tài khoản",
      }),
    );
    const inquiry = await db.inquiry.findFirstOrThrow({
      where: { userId: c.id },
    });
    assert.equal(inquiry.email, "different@acceptance.local");
    const profile = await admin.req("/admin/khach-hang/" + c.id);
    assert.equal(profile.status, 200);
    assert(profile.bytes.toString().includes(inquiry.subject));
    const forbidden = await seller.req("/admin/khach-hang/" + c.id);
    assert(forbidden.bytes.toString().includes("Không có quyền truy cập"));
    assert(!forbidden.bytes.toString().includes(c.id + "@acceptance.local"));
  },
);
await run(
  "BA-CUSTOMER-02 lock revokes sessions and unlock never revives old tokens",
  async () => {
    const c = await actor();
    await ok(admin.post("admin/customer", { id: c.id, active: false }));
    await rejected(c.post("cart", { variantId: variant.id, quantity: 1 }));
    await ok(admin.post("admin/customer", { id: c.id, active: true }));
    await rejected(c.post("cart", { variantId: variant.id, quantity: 1 }));
  },
);
await run(
  "BA-AUTH-01 expired session cannot mutate cart or cancel via service",
  async () => {
    const c = await actor(),
      order = await place(c);
    await db.session.updateMany({
      where: { userId: c.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await rejected(c.post("cart", { variantId: variant.id, quantity: 1 }));
    await db.user.update({ where: { id: c.id }, data: { active: false } });
    await assert.rejects(() => cancelOrderItems(change(order), c));
  },
);
await run(
  "BA-SETTINGS-03 supplemental policies reach public pages safely",
  async () => {
    const text = "Chính sách bổ sung kiểm thử <script>alert(1)</script>";
    await ok(
      admin.post("admin/settings", {
        salesPolicy: text,
        returnsInstructions: text,
      }),
    );
    for (const path of ["/chinh-sach-giao-hang", "/chinh-sach-doi-tra"]) {
      const r = await buyer.req(path);
      assert.equal(r.status, 200);
      assert(r.bytes.toString().includes("Chính sách bổ sung kiểm thử"));
      assert(r.bytes.toString().includes("&lt;script&gt;"));
    }
  },
);
await run(
  "BA-REPORT-01 valid Excel download and financial permission enforcement",
  async () => {
    const path = "/api/analytics/export?section=sales&format=xlsx";
    const r = await admin.req(path);
    assert.equal(r.status, 200);
    assert(r.headers.get("content-type")?.includes("spreadsheetml"));
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(r.bytes as unknown as ExcelJS.Buffer);
    assert(book.worksheets[0].rowCount > 0);
    assert.equal((await seller.req(path)).status, 403);
    assert.equal((await buyer.req(path)).status, 403);
  },
);
await run(
  "BA-REPORT-02 unknown format and invalid dates rejected",
  async () => {
    await rejected(admin.req("/api/analytics/export?section=sales&format=exe"));
    await rejected(
      admin.req(
        "/api/analytics/export?section=sales&period=custom&from=2026-02-30&to=2026-03-01",
      ),
    );
  },
);
await run(
  "BA-DATA-01 foreign keys stock money and snapshots consistent",
  async () => {
    assert.equal(
      (await db.$queryRawUnsafe<any[]>("PRAGMA foreign_key_check")).length,
      0,
    );
    assert.equal(
      await db.productVariant.count({ where: { stock: { lt: 0 } } }),
      0,
    );
    const orders = await db.order.findMany({
      where: { items: { some: { productId: product.id } } },
      include: { items: true, payments: true },
    });
    for (const o of orders) {
      assert.equal(
        o.subtotal,
        o.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
      );
      assert.equal(o.total, o.subtotal - o.discount + o.shipping);
      assert.equal(o.payments[0].amount, o.total);
      assert(
        o.items.every(
          (i) => i.originalQuantity == null || i.originalQuantity >= i.quantity,
        ),
      );
    }
  },
);

await run(
  "BA-AUTH-02 register validates input and never accepts a privileged role",
  async () => {
    const c = new Client(randomUUID(), "");
    const email = randomUUID() + "@acceptance.local",
      password = randomBytes(16).toString("hex");
    await rejected(
      c.post("register", {
        name: "QA",
        phone: "invalid",
        email,
        password,
        confirmPassword: password,
      }),
    );
    await ok(
      c.post("register", {
        name: "QA",
        phone: "0912345678",
        email,
        password,
        confirmPassword: password,
        role: "ADMIN",
      }),
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { email } })).role,
      "CUSTOMER",
    );
    await rejected(
      c.post("register", {
        name: "QA",
        phone: "0912345678",
        email,
        password,
        confirmPassword: password,
      }),
    );
    await rejected(c.post("login", { email, password: "wrong-password" }));
    const response = await c.post("login", { email, password });
    assert.equal(response.status, 200);
    const token = response.headers
      .getSetCookie()
      .find((v) => v.startsWith("hn_session="))!
      .split(";")[0]
      .slice("hn_session=".length);
    c.token = token;
    await ok(
      c.post("profile", { name: "Updated profile", phone: "0912345678" }),
    );
    await ok(c.post("logout", {}));
    await rejected(
      c.post("profile", { name: "Should fail", phone: "0912345678" }),
    );
  },
);
await run(
  "BA-AUTH-03 reset token concurrency one-use and session revocation",
  async () => {
    const c = await actor(),
      token = randomBytes(32).toString("hex"),
      password = randomBytes(16).toString("hex");
    const user = await db.user.findUniqueOrThrow({ where: { id: c.id } });
    await db.passwordReset.create({
      data: {
        email: user.email,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const result = await Promise.all([
      c.post("reset", { resetToken: token, password }),
      c.post("reset", { resetToken: token, password }),
    ]);
    assert.equal(result.filter((r) => r.status === 200).length, 1);
    assert.equal(await db.session.count({ where: { userId: c.id } }), 0);
    assert(
      await compare(
        password,
        (await db.user.findUniqueOrThrow({ where: { id: c.id } })).passwordHash,
      ),
    );
    await rejected(c.post("reset", { resetToken: token, password }));
  },
);
await run("BA-AUTH-04 expired reset cannot change password", async () => {
  const c = await actor(),
    token = randomBytes(32).toString("hex"),
    user = await db.user.findUniqueOrThrow({ where: { id: c.id } });
  await db.passwordReset.create({
    data: {
      email: user.email,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  await rejected(
    c.post("reset", {
      resetToken: token,
      password: randomBytes(16).toString("hex"),
    }),
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: c.id } })).passwordHash,
    user.passwordHash,
  );
});
await run(
  "BA-AUTH-05 password and session revocation rollback on audit failure",
  async () => {
    const c = await actor(),
      password = randomBytes(16).toString("hex");
    await db.user.update({
      where: { id: c.id },
      data: { passwordHash: await hash(password, 10) },
    });
    await failAudit("PASSWORD_CHANGED", () =>
      rejected(
        c.post("password", {
          oldPassword: password,
          password: "Different-Strong-password",
        }),
      ).then(() => {}),
    );
    assert(
      await compare(
        password,
        (await db.user.findUniqueOrThrow({ where: { id: c.id } })).passwordHash,
      ),
    );
    assert.equal(await db.session.count({ where: { userId: c.id } }), 1);
    await ok(
      c.post("password", {
        oldPassword: password,
        password: "Different-Strong-password",
      }),
    );
    assert.equal(await db.session.count({ where: { userId: c.id } }), 0);
  },
);
await run(
  "BA-AUTH-06 local recovery mailbox works in production preview without email leak",
  async () => {
    const c = await actor(),
      user = await db.user.findUniqueOrThrow({ where: { id: c.id } }),
      before = new Set(await readdir(".local-mail").catch(() => []));
    const response = await c.post("forgot", { email: user.email });
    assert.equal(response.status, 200);
    assert(!JSON.stringify(response.body).includes("token="));
    const added = (await readdir(".local-mail")).filter((f) => !before.has(f));
    assert.equal(added.length, 1);
    const path = ".local-mail/" + added[0];
    try {
      const text = await readFile(path, "utf8");
      assert(text.includes(user.email));
      assert.match(text, /token=[a-f0-9]{64}/);
      assert.equal((await stat(path)).mode & 0o777, 0o600);
    } finally {
      await unlink(path);
    }
    const unknown = await c.post("forgot", {
      email: randomUUID() + "@acceptance.local",
    });
    assert.deepEqual(unknown.body, response.body);
  },
);
await run("BA-CUSTOMER-03 address ownership create edit delete", async () => {
  const c = await actor();
  await ok(c.post("address", address));
  const row = await db.address.findFirstOrThrow({ where: { userId: c.id } });
  await rejected(
    other.post("address", { ...address, id: row.id, street: "Cannot modify" }),
  );
  await rejected(other.post("address", { id: row.id, delete: true }));
  assert.deepEqual(
    await db.address.findUniqueOrThrow({ where: { id: row.id } }),
    row,
  );
  await ok(
    c.post("address", { ...address, id: row.id, street: "Updated street" }),
  );
  assert.equal(
    (await db.address.findUniqueOrThrow({ where: { id: row.id } })).street,
    "Updated street",
  );
  await ok(c.post("address", { id: row.id, delete: true }));
  assert.equal(await db.address.count({ where: { id: row.id } }), 0);
});
async function prepared() {
  const owner = await actor(),
    o = await place(owner, 2);
  await ok(admin.post("admin/order", { id: o.id, status: "CONFIRMED" }));
  await ok(admin.post("admin/order", { id: o.id, status: "PROCESSING" }));
  return { owner, order: o };
}
function packInput(order: any) {
  return {
    id: order.id,
    eventKey: randomUUID(),
    kind: "PACK",
    reason: "Đã kiểm đúng SKU màu size và số lượng",
    items: order.items
      .filter((i: any) => i.quantity > 0)
      .map((i: any) => ({ id: i.id, quantity: i.quantity, checked: true })),
  };
}
await run(
  "BA-PACK-01 missing checklist or wrong quantity cannot hand over",
  async () => {
    const { order } = await prepared();
    await rejected(
      admin.post("admin/order/pack", { ...packInput(order), items: [] }),
    );
    await rejected(
      admin.post("admin/order/pack", {
        ...packInput(order),
        items: [{ id: order.items[0].id, quantity: 1, checked: true }],
      }),
    );
    await rejected(
      admin.post("admin/order", {
        id: order.id,
        status: "SHIPPING",
        reason: "Chưa đóng gói",
      }),
    );
    await rejected(
      admin.post("admin/shipping/create", {
        orderId: order.id,
        provider: "LOCAL_MANUAL",
        shippingFee: 0,
        parcelDescription: "Kiện chưa đóng",
        weightGrams: 500,
        parcelCount: 1,
      }),
    );
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).packedAt,
      null,
    );
  },
);
await run(
  "BA-PACK-02 hold then exact checklist packs once without stock change",
  async () => {
    const { order } = await prepared(),
      before = (
        await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
      ).stock;
    await ok(
      seller.post("admin/order/pack", {
        id: order.id,
        eventKey: randomUUID(),
        kind: "HOLD",
        reason: "Tạm dừng kiểm tra thiếu hàng",
      }),
    );
    const d = packInput(order);
    const result = await Promise.all([
      seller.post("admin/order/pack", d),
      seller.post("admin/order/pack", d),
    ]);
    assert(result.every((r) => r.status === 200));
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    assert(o.packedAt);
    assert.equal(o.packingHoldReason, null);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before,
    );
    assert.equal(
      await db.auditLog.count({
        where: { targetId: order.id, action: "ORDER_PACKED" },
      }),
      1,
    );
  },
);
await run(
  "BA-PACK-03 permission terminal state and audit rollback",
  async () => {
    const { order, owner } = await prepared(),
      d = packInput(order);
    await rejected(owner.post("admin/order/pack", d));
    await failAudit("ORDER_PACKED", () =>
      rejected(admin.post("admin/order/pack", d)).then(() => {}),
    );
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).packedAt,
      null,
    );
    await ok(admin.post("admin/order/pack", d));
    await rejected(
      admin.post("admin/order/pack", { ...d, eventKey: randomUUID() }),
    );
  },
);
await run(
  "BA-ASSIGN-01 assignment priority invalid staff and customer rejection",
  async () => {
    const { order, owner } = await prepared();
    await ok(
      admin.post("admin/order/assign", {
        id: order.id,
        assignedTo: seller.id,
        priority: "HIGH",
        reason: "Đơn cần ưu tiên",
      }),
    );
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(o.assignedTo, seller.id);
    assert.equal(o.priority, "HIGH");
    await rejected(
      admin.post("admin/order/assign", {
        id: order.id,
        assignedTo: owner.id,
        priority: "NORMAL",
        reason: "Không thể gán khách",
      }),
    );
    await rejected(
      owner.post("admin/order/assign", {
        id: order.id,
        assignedTo: seller.id,
        priority: "HIGH",
        reason: "Vượt quyền",
      }),
    );
  },
);
async function stocktake(counted: number, damaged = 0) {
  return ok(
    admin.post("admin/stocktakes/create", {
      eventKey: randomUUID(),
      reason: "Kiểm đếm thực tế",
      lines: [
        { sku: variant.sku, countedStock: counted, damagedStock: damaged },
      ],
    }),
  );
}
await run(
  "BA-STOCKTAKE-01 draft submit approve with damaged stock quarantined",
  async () => {
    const before = (
        await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
      ).stock,
      r = await stocktake(before - 1, 3);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before,
    );
    await ok(
      admin.post("admin/stocktakes/status", {
        id: r.id,
        status: "SUBMITTED",
        reason: "Gửi phê duyệt",
      }),
    );
    await ok(
      seller.post("admin/stocktakes/status", {
        id: r.id,
        status: "APPROVED",
        reason: "Xác nhận lượng bán được",
      }),
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before - 1,
    );
    assert.equal(
      await db.inventoryMovement.count({
        where: { eventKey: `stocktake:${r.id}:${variant.id}`, delta: -1 },
      }),
      1,
    );
  },
);
await run(
  "BA-STOCKTAKE-02 duplicate concurrent approvals exactly once",
  async () => {
    const before = (
        await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
      ).stock,
      r = await stocktake(before + 2);
    await ok(
      admin.post("admin/stocktakes/status", {
        id: r.id,
        status: "SUBMITTED",
        reason: "Gửi xác nhận",
      }),
    );
    const d = { id: r.id, status: "APPROVED", reason: "Duyệt điều chỉnh" };
    const result = await Promise.all([
      admin.post("admin/stocktakes/status", d),
      admin.post("admin/stocktakes/status", d),
    ]);
    assert(result.every((r) => r.status === 200));
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before + 2,
    );
    assert.equal(
      await db.inventoryMovement.count({
        where: { eventKey: `stocktake:${r.id}:${variant.id}` },
      }),
      1,
    );
  },
);
await run(
  "BA-STOCKTAKE-03 stale count never overwrites intervening stock movement",
  async () => {
    const before = (
        await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
      ).stock,
      r = await stocktake(before - 2);
    await ok(
      admin.post("admin/stocktakes/status", {
        id: r.id,
        status: "SUBMITTED",
        reason: "Gửi xác nhận",
      }),
    );
    await ok(
      admin.post("admin/inventory-movement", {
        sku: variant.sku,
        kind: "OUT",
        quantity: 1,
        date: new Date().toISOString(),
        reason: "Xuất sau kiểm kê",
        eventKey: randomUUID(),
      }),
    );
    await rejected(
      admin.post("admin/stocktakes/status", {
        id: r.id,
        status: "APPROVED",
        reason: "Không được ghi đè",
      }),
    );
    assert.equal(
      (await db.stocktake.findUniqueOrThrow({ where: { id: r.id } })).status,
      "SUBMITTED",
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before - 1,
    );
  },
);
await run(
  "BA-STOCKTAKE-04 invalid SKU counts duplicate line state and permission",
  async () => {
    for (const lines of [
      [{ sku: "MISSING", countedStock: 1 }],
      [{ sku: variant.sku, countedStock: -1 }],
      [{ sku: variant.sku, countedStock: 1.2 }],
      [
        { sku: variant.sku, countedStock: 1 },
        { sku: variant.sku, countedStock: 2 },
      ],
    ])
      await rejected(
        admin.post("admin/stocktakes/create", {
          eventKey: randomUUID(),
          reason: "Kiểm kê không hợp lệ",
          lines,
        }),
      );
    await rejected(
      buyer.post("admin/stocktakes/create", {
        eventKey: randomUUID(),
        reason: "Không có quyền",
        lines: [{ sku: variant.sku, countedStock: 1 }],
      }),
    );
    const r = await stocktake(1);
    await rejected(
      admin.post("admin/stocktakes/status", {
        id: r.id,
        status: "APPROVED",
        reason: "Không được bỏ bước",
      }),
    );
    await ok(
      admin.post("admin/stocktakes/status", {
        id: r.id,
        status: "CANCELLED",
        reason: "Hủy phiếu nháp",
      }),
    );
    await rejected(
      admin.post("admin/stocktakes/status", {
        id: r.id,
        status: "SUBMITTED",
        reason: "Phiếu đã kết thúc",
      }),
    );
  },
);
await run(
  "BA-STOCKTAKE-05 audit failure rolls back approval and movements",
  async () => {
    const before = (
        await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
      ).stock,
      r = await stocktake(before + 3);
    await ok(
      admin.post("admin/stocktakes/status", {
        id: r.id,
        status: "SUBMITTED",
        reason: "Gửi xác nhận",
      }),
    );
    await failAudit("STOCKTAKE_APPROVED", () =>
      rejected(
        admin.post("admin/stocktakes/status", {
          id: r.id,
          status: "APPROVED",
          reason: "Kiểm thử rollback",
        }),
      ).then(() => {}),
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
        .stock,
      before,
    );
    assert.equal(
      await db.inventoryMovement.count({
        where: { eventKey: `stocktake:${r.id}:${variant.id}` },
      }),
      0,
    );
  },
);
let reviewOrder: any, reviewOwner: Client, reviewId: string;
await run(
  "BA-FEEDBACK-01 verified purchase review and duplicate protection",
  async () => {
    const setup = await prepared();
    reviewOrder = setup.order;
    reviewOwner = setup.owner;
    await ok(admin.post("admin/order/pack", packInput(reviewOrder)));
    for (const status of ["SHIPPING", "DELIVERED"])
      await ok(
        admin.post("admin/order", {
          id: reviewOrder.id,
          status,
          reason: "Giao nhận kiểm thử",
          reference: "LOCAL-QA",
        }),
      );
    const d = {
      orderId: reviewOrder.id,
      productId: product.id,
      rating: 5,
      comment: "Sản phẩm nhận đúng thiết kế, đánh giá kiểm thử",
      eventKey: randomUUID(),
    };
    const result = await Promise.all([
      reviewOwner.post("reviews", d),
      reviewOwner.post("reviews", d),
    ]);
    assert(result.every((r) => r.status === 200));
    reviewId = (
      await db.productReview.findFirstOrThrow({
        where: { orderId: reviewOrder.id },
      })
    ).id;
    assert.equal(
      await db.productReview.count({ where: { orderId: reviewOrder.id } }),
      1,
    );
    await rejected(
      reviewOwner.post("reviews", { ...d, eventKey: randomUUID() }),
    );
  },
);
await run(
  "BA-FEEDBACK-02 wrong owner item rating and undelivered order rejected",
  async () => {
    const d = {
      orderId: reviewOrder.id,
      productId: product.id,
      rating: 5,
      comment: "Không phải khách mua",
      eventKey: randomUUID(),
    };
    await rejected(other.post("reviews", d));
    await rejected(reviewOwner.post("reviews", { ...d, rating: 6 }));
    await rejected(reviewOwner.post("reviews", { ...d, productId: "foreign" }));
    const o = await place(await actor());
    await rejected(other.post("reviews", { ...d, orderId: o.id }));
  },
);
await run(
  "BA-FEEDBACK-03 seller replies once and moderate preserves evidence",
  async () => {
    const d = {
      id: reviewId,
      eventKey: randomUUID(),
      content: "Cửa hàng đã tiếp nhận phản hồi của khách",
    };
    await ok(seller.post("admin/reviews/reply", d));
    await ok(seller.post("admin/reviews/reply", d));
    assert.equal(await db.reviewReply.count({ where: { reviewId } }), 1);
    await rejected(
      buyer.post("admin/reviews/reply", { ...d, eventKey: randomUUID() }),
    );
    await ok(
      seller.post("admin/reviews/moderate", {
        id: reviewId,
        hidden: true,
        reason: "Tạm ẩn nội dung kiểm thử",
      }),
    );
    assert(
      (await db.productReview.findUniqueOrThrow({ where: { id: reviewId } }))
        .hidden,
    );
    assert.equal(await db.reviewReply.count({ where: { reviewId } }), 1);
    await ok(
      seller.post("admin/reviews/moderate", {
        id: reviewId,
        hidden: false,
        reason: "Khôi phục đánh giá hợp lệ",
      }),
    );
  },
);
await run(
  "BA-FEEDBACK-04 support thread ownership reply and audit rollback",
  async () => {
    const c = await actor();
    await ok(
      c.post("contact", {
        name: "Khách kiểm thử",
        email: "support@acceptance.local",
        message: "Nội dung cần cửa hàng hỗ trợ",
        subject: "Hỗ trợ đơn hàng",
      }),
    );
    const inquiry = await db.inquiry.findFirstOrThrow({
        where: { userId: c.id },
      }),
      d = {
        id: inquiry.id,
        eventKey: randomUUID(),
        content: "Cửa hàng đã tiếp nhận và hỗ trợ",
      };
    await ok(seller.post("support/reply", d));
    await ok(seller.post("support/reply", d));
    assert.equal(
      await db.inquiryReply.count({ where: { inquiryId: inquiry.id } }),
      1,
    );
    await rejected(
      other.post("support/reply", { ...d, eventKey: randomUUID() }),
    );
    await ok(
      c.post("support/reply", {
        ...d,
        eventKey: randomUUID(),
        content: "Khách bổ sung thông tin cần kiểm tra",
      }),
    );
    await failAudit("INQUIRY_REPLIED", () =>
      rejected(
        seller.post("support/reply", { ...d, eventKey: randomUUID() }),
      ).then(() => {}),
    );
    assert.equal(
      await db.inquiryReply.count({ where: { inquiryId: inquiry.id } }),
      2,
    );
  },
);
await run(
  "BA-ADDRESS-01 exactly one default and deletion chooses surviving address",
  async () => {
    const c = await actor();
    await ok(c.post("address", address));
    await ok(c.post("address", { ...address, street: "Địa chỉ thứ hai" }));
    const rows = await db.address.findMany({
      where: { userId: c.id },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(rows.filter((a) => a.isDefault).length, 1);
    await ok(c.post("address", { id: rows[1].id, makeDefault: true }));
    assert.equal(
      await db.address.count({ where: { userId: c.id, isDefault: true } }),
      1,
    );
    assert(
      (await db.address.findUniqueOrThrow({ where: { id: rows[1].id } }))
        .isDefault,
    );
    await ok(c.post("address", { id: rows[1].id, delete: true }));
    assert(
      (await db.address.findUniqueOrThrow({ where: { id: rows[0].id } }))
        .isDefault,
    );
    await rejected(
      other.post("address", { id: rows[0].id, makeDefault: true }),
    );
  },
);
await run(
  "BA-CATALOG-01 category collection validation membership and atomic audit",
  async () => {
    const cat = {
      name: "Danh mục kiểm thử",
      slug: "category-" + randomUUID(),
      description: "Danh mục kiểm thử hợp lệ",
      image: category.image,
      parentId: "",
      active: true,
    };
    const created = await ok(admin.post("admin/category", cat));
    await rejected(admin.post("admin/category", cat));
    await rejected(
      admin.post("admin/category", {
        ...cat,
        id: created.id,
        parentId: created.id,
      }),
    );
    await failAudit("CATEGORY", () =>
      rejected(
        admin.post("admin/category", {
          ...cat,
          id: created.id,
          name: "Must rollback",
        }),
      ).then(() => {}),
    );
    assert.equal(
      (await db.category.findUniqueOrThrow({ where: { id: created.id } })).name,
      cat.name,
    );
    const col = {
      name: "Collection test",
      slug: "collection-" + randomUUID(),
      description: "Collection kiểm thử hợp lệ",
      image: category.image,
      productIds: [product.id],
    };
    const result = await ok(admin.post("admin/collection", col));
    assert.equal(
      await db.collectionProduct.count({
        where: { collectionId: result.id, productId: product.id },
      }),
      1,
    );
    await rejected(buyer.post("admin/collection", col));
    await rejected(
      admin.post("admin/collection", {
        ...col,
        id: result.id,
        productIds: ["foreign"],
      }),
    );
    assert.equal(
      await db.collectionProduct.count({
        where: { collectionId: result.id, productId: product.id },
      }),
      1,
    );
  },
);

await run(
  "BA-CART-07 owned bulk clear retry cannot delete newly added items",
  async () => {
    const c = await actor();
    await add(c, 2);
    const key = randomUUID();
    await ok(c.post("cart/clear", { eventKey: key }));
    assert.equal(
      await db.cartItem.count({ where: { cart: { userId: c.id } } }),
      0,
    );
    await add(c, 1);
    await ok(c.post("cart/clear", { eventKey: key }));
    assert.equal(
      await db.cartItem.count({ where: { cart: { userId: c.id } } }),
      1,
    );
  },
);
await run(
  "BA-SEARCH-01 invalid price range rejected with consistent empty UI",
  async () => {
    for (const q of ["min=20&max=10", "min=-1", "max=bad"]) {
      const r = await buyer.req("/api/search?" + q);
      assert.equal(r.status, 400);
    }
    const page = await buyer.req("/hang-moi?min=20&max=10");
    assert.equal(page.status, 200);
    assert(page.bytes.toString().includes("Khoảng giá không hợp lệ"));
    const valid = await buyer.req("/api/search?max=0");
    assert.equal(valid.status, 200);
    assert.equal(valid.body.count, 0);
  },
);

await run(
  "BA-CATALOG-02 color gallery size chart and readiness gates",
  async () => {
    const c = await ok(
      admin.post("admin/color", {
        productId: product.id,
        name: "Đỏ kiểm thử",
        hex: "#cc0000",
        position: 0,
        imagesText: category.image,
      }),
    );
    assert.equal(
      (await db.colorImage.findMany({ where: { colorId: c.id } })).length,
      1,
    );
    await rejected(
      admin.post("admin/color", {
        id: c.id,
        productId: "foreign",
        name: "Đỏ",
        hex: "#cc0000",
        position: 0,
        imagesText: category.image,
      }),
    );
    const chart = sampleChart("top");
    await ok(
      admin.post("admin/size-chart", {
        productId: product.id,
        categoryId: category.id,
        scope: "product",
        kind: chart.kind,
        notes: chart.notes,
        rowsJson: JSON.stringify(chart.rows),
        matrixJson: JSON.stringify(chart.matrix),
      }),
    );
    assert(await db.sizeChart.findUnique({ where: { productId: product.id } }));
    await rejected(
      admin.post("admin/size-chart", {
        productId: product.id,
        categoryId: category.id,
        scope: "product",
        kind: "top",
        notes: "invalid",
        rowsJson: "{bad",
        matrixJson: "[]",
      }),
    );
    await rejected(
      admin.post("admin/publication", {
        productId: product.id,
        publicationStatus: "READY",
        merchandiseVerified: true,
      }),
    );
    assert.notEqual(
      (await db.product.findUniqueOrThrow({ where: { id: product.id } }))
        .publicationStatus,
      "READY",
    );
    const before = await db.productColor.findUniqueOrThrow({
      where: { id: c.id },
    });
    await failAudit("COLOR", () =>
      rejected(
        admin.post("admin/color", {
          id: c.id,
          productId: product.id,
          name: "Must rollback",
          hex: "#cc0000",
          position: 0,
          imagesText: category.image,
        }),
      ).then(() => {}),
    );
    assert.deepEqual(
      await db.productColor.findUniqueOrThrow({ where: { id: c.id } }),
      before,
    );
  },
);
await run(
  "BA-CATALOG-03 valid outfit and invalid self recommendation",
  async () => {
    const source = await db.productColor.findFirstOrThrow({
      where: { productId: product.id },
    });
    const targetSku = nextProductSku(
      skuPrefix,
      await db.product.findMany({
        where: { sku: { startsWith: skuPrefix } },
        select: { sku: true },
      }),
    );
    const target = await db.product.create({
      data: {
        name: "Outfit target",
        slug: "outfit-" + randomUUID(),
        sku: targetSku,
        description: "Fixture outfit hợp lệ",
        categoryId: category.id,
        material: "Cotton",
        style: "Test",
        fit: "regular",
        occasion: "Test",
        searchText: "outfit",
        price: 100001,
        colors: {
          create: {
            name: "Đen",
            hex: "#000000",
            images: { create: { url: category.image, alt: "Test" } },
          },
        },
      },
      include: { colors: true },
    });
    await db.productVariant.create({
      data: {
        productId: target.id,
        colorId: target.colors[0].id,
        color: "Đen",
        colorHex: "#000000",
        size: "M",
        sku: `${target.sku}-M-BLACK`,
        stock: 1,
      },
    });
    const record = await ok(
      admin.post("admin/outfit", {
        colorId: source.id,
        productId: target.id,
        targetColorId: target.colors[0].id,
        title: "Phối cùng thiết kế phù hợp",
      }),
    );
    assert.equal(
      await db.outfitItem.count({
        where: { outfitId: record.id, productId: target.id },
      }),
      1,
    );
    await rejected(
      admin.post("admin/outfit", {
        colorId: source.id,
        productId: product.id,
        targetColorId: source.id,
        title: "Không tự phối với chính mình",
      }),
    );
  },
);

await run(
  "BA-AUDIT-01 profile and registration fail atomically on audit failure",
  async () => {
    const c = await actor(),
      before = await db.user.findUniqueOrThrow({ where: { id: c.id } });
    await failAudit("PROFILE_UPDATED", () =>
      rejected(
        c.post("profile", { name: "Must rollback", phone: "0912345678" }),
      ).then(() => {}),
    );
    assert.deepEqual(
      await db.user.findUniqueOrThrow({ where: { id: c.id } }),
      before,
    );
    const email = randomUUID() + "@acceptance.local",
      password = randomUUID();
    await failAudit("CUSTOMER_REGISTERED", () =>
      rejected(
        c.post("register", {
          name: "Khách mới",
          email,
          phone: "0912345678",
          password,
          confirmPassword: password,
        }),
      ).then(() => {}),
    );
    assert.equal(await db.user.count({ where: { email } }), 0);
  },
);
await writeFile(
  "verification/business-acceptance/business-results.json",
  JSON.stringify({ database, results }, null, 2),
);
await db.$disconnect();
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
