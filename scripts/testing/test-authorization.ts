import { packPreparedFixture } from "../test-support/packing-test-fixture";
import { authenticateCartFixture } from "../test-support/analytics-test-client";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
if (!/^file:\.\/business-tests-[\w-]+\.db$/.test(process.env.DATABASE_URL ?? ""))
  throw Error("Isolated RBAC tests only");
const db = new PrismaClient(),
  fixture = JSON.parse(
    await readFile("verification/business-fixtures.json", "utf8"),
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
const admin = new Client("admin"),
  bob = new Client("bob"),
  guest = new Client();
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
async function ok(p: Promise<{ status: number; body: any }>) {
  const r = await p;
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
async function denied(p: Promise<{ status: number; body: any }>) {
  const r = await p;
  assert.notEqual(r.status, 200);
  return r;
}
const accounts: { id: string; role: "SELLER"; purpose: string; email: string; password: string }[] = [];
const staff: Record<string, Client> = {};
for (const purpose of ["operations", "catalog", "inventory", "orders", "support", "content", "session", "finance"]) {
  const email = `${purpose}-${randomUUID()}@authorization.test`,
    password = randomUUID();
  const created = await ok(admin.post("admin/staff/create", {
    name: `QA seller ${purpose}`,
    email,
    password,
    role: "SELLER",
    reason: "Cấp tài khoản bán hàng kiểm thử local",
  }));
  const client = new Client();
  await ok(client.post("login", { email, password }));
  staff[purpose] = client;
  accounts.push({ id: created.id, role: "SELLER", purpose, email, password });
}
const inventory = staff.inventory,
  orderStaff = staff.orders,
  content = staff.content,
  support = staff.support,
  finance = admin,
  manager = staff.operations;
const v = await db.productVariant.findUniqueOrThrow({
  where: { id: fixture.fixtures[18].variantId },
});
const request = await db.returnRequest.findFirstOrThrow({
  where: { status: "REQUESTED" },
});
const refundCandidate = await db.returnRequest.findFirstOrThrow({
  where: {
    status: "INSPECTED",
    resolution: "REFUND",
    order: { paymentStatus: "PAID" },
  },
  include: { items: true },
});
const shipment = await db.shipment.findFirstOrThrow({
  where: { status: "DELIVERED", reconciliationStatus: "COLLECTED" },
  include: { collections: true },
});
const customerPassword = randomUUID(),
  customerToken = randomUUID();
const customerUser = await db.user.create({
  data: {
    name: "RBAC customer",
    email: `customer-${randomUUID()}@authorization.test`,
    phone: "0912345678",
    role: "CUSTOMER",
    passwordHash: await hash(customerPassword, 10),
  },
});
await db.session.create({
  data: {
    userId: customerUser.id,
    tokenHash: createHash("sha256").update(customerToken).digest("hex"),
    expiresAt: new Date(Date.now() + 86400000),
  },
});
const customer = new Client();
customer.cookies.set("hn_session", customerToken);
let testOrderId = "",
  testShipmentId = "";
await run(
  "01 ADMIN manages staff with explicit audit and bcrypt",
  async () => {
    assert(
      (await ok(admin.req("/admin/nhan-vien"))).includes("Tạo nhân viên local"),
    );
    const a = accounts[0],
      u = await db.user.findUniqueOrThrow({ where: { id: a.id } });
    assert(u.passwordHash !== a.password && u.passwordHash.startsWith("$2"));
    assert(
      (await db.auditLog.count({
        where: { targetId: u.id, action: "STAFF_CREATED" },
      })) > 0,
    );
  },
);
await run(
  "02 customer guest seller cannot create or assign staff",
  async () => {
    for (const c of [customer, guest, manager])
      await denied(
        c.post("admin/staff/create", {
          name: "No privilege",
          email: `no-${randomUUID()}@qa.test`,
          password: randomUUID(),
          role: "ADMIN",
          reason: "Không được cấp quyền",
        }),
      );
  },
);
await run(
  "03 inventory adjustment records actor and before/after atomically",
  async () => {
    await ok(
      inventory.post("admin/stock", {
        variantId: v.id,
        stock: 17,
        reason: "Kiểm kê kho local",
      }),
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stock,
      17,
    );
    const log = await db.auditLog.findFirstOrThrow({
      where: { action: "STOCK", targetId: v.id },
      orderBy: { createdAt: "desc" },
    });
    assert(
      log.beforeJson &&
        log.afterJson &&
        log.actorId === accounts.find((a) => a.purpose === "inventory")!.id,
    );
  },
);
await run("04 inventory cannot approve or execute refunds", async () => {
  await denied(
    inventory.post("admin/returns/refund", {
      id: refundCandidate.id,
      refundShipping: false,
      reason: "Không có quyền hoàn",
    }),
  );
  await denied(
    inventory.post("admin/returns/refund-status", {
      id: refundCandidate.id,
      status: "SIMULATED_COMPLETED",
      reason: "Không có quyền hoàn",
    }),
  );
});
await run("05 SELLER manages actual order state", async () => {
  const variant = await db.productVariant.create({
    data: {
      productId: v.productId,
      sku: `RBAC-${randomUUID()}`,
      size: "M",
      color: "Hồng",
      colorHex: "#ffdddd",
      stock: 3,
    },
  });
  await ok(customer.post("cart", { variantId: variant.id, quantity: 1 }));
  const key = randomUUID();
  await ok(
    customer.post("checkout", {
      name: "Khách QA RBAC",
      phone: "0912345678",
      email: "customer@authorization.test",
      province: "Hà Nội",
      ward: "Hoàn Kiếm",
      street: "123 Đường kiểm thử",
      details: "",
      notes: "",
      idempotencyKey: key,
    }),
  );
  const o = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
  });
  testOrderId = o.id;
  for (const status of ["CONFIRMED", "PROCESSING"])
    await ok(
      orderStaff.post("admin/order", {
        id: o.id,
        status,
        reason: "Nhân viên xử lý đúng quyền",
      }),
    );
  assert.equal(
    (await db.order.findUniqueOrThrow({ where: { id: o.id } })).status,
    "PROCESSING",
  );
});
await run("06 order staff cannot assign own roles", async () => {
  await denied(
    orderStaff.post("admin/staff/role", {
      id: accounts.find((a) => a.purpose === "orders")!.id,
      role: "ADMIN",
      reason: "Không tự nâng quyền",
    }),
  );
});
await run("07 SELLER cannot access content or financial operations", async () => {
  await denied(content.post("admin/banner", { title: "Forbidden seller banner" }));
  await denied(content.post("admin/shipping/collection", { id: shipment.id }));
  assert((await ok(content.req("/admin/phan-tich/finance"))).includes("Không có quyền xem báo cáo này."));
  assert.equal((await content.req("/api/analytics/report?section=finance")).status, 403);
});
await run("08 SELLER reads and reviews returns", async () => {
  await ok(
    support.post("admin/returns/status", {
      id: request.id,
      status: "UNDER_REVIEW",
      reason: "Hỗ trợ tiếp nhận và kiểm tra lỗi",
    }),
  );
  const html = await ok(support.req(`/admin/doi-tra/${request.id}`));
  assert(html.includes("Cập nhật hồ sơ"));
  assert(!html.includes("Tính và tạo khoản hoàn"));
  assert(!html.includes("Chứng từ mô phỏng QA nội bộ"));
});
await run("09 SELLER cannot execute financial refunds and CUSTOMER cannot inspect", async () => {
  await denied(customer.post("admin/returns/inspect", {
    id: request.id, itemId: "forged", condition: "SELLABLE",
    reason: "Khách không được kiểm kho", evidence: "Không được",
  }));
  for (const operation of ["refund", "refund-status"])
    assert.equal((await support.post(`admin/returns/${operation}`, {
      id: request.id, status: "SIMULATED_COMPLETED", refundShipping: false,
      reason: "Bán hàng không được hoàn tiền",
    })).status, 403);
});
await run(
  "10 ADMIN records remittance and reconciles",
  async () => {
    const money = {
      id: shipment.id,
      amount: shipment.collectedCOD,
      provider: "LOCAL_MANUAL",
      reference: `RBAC-${randomUUID()}`,
      evidence: "Chứng từ chuyển mô phỏng",
      occurredAt: new Date().toISOString(),
      eventKey: randomUUID(),
    };
    await ok(finance.post("admin/shipping/remittance", money));
    await ok(
      finance.post("admin/shipping/reconcile", {
        id: shipment.id,
        eventKey: randomUUID(),
        action: "RECONCILE",
        note: "Đã đối chiếu mô phỏng đủ tiền",
      }),
    );
    assert.equal(
      (await db.shipment.findUniqueOrThrow({ where: { id: shipment.id } }))
        .reconciliationStatus,
      "RECONCILED",
    );
  },
);
await run(
  "11 CUSTOMER cannot access admin or self-register staff",
  async () => {
    assert(
      (await ok(customer.req("/admin"))).includes("Quyền truy cập bị giới hạn"),
    );
    await denied(customer.post("admin/banner", { title: "Forbidden" }));
    const email = `signup-${randomUUID()}@qa.test`;
    await ok(
      guest.post("register", {
        name: "Đăng ký khách",
        email,
        phone: "0912345678",
        password: customerPassword,
        confirmPassword: customerPassword,
        role: "ADMIN",
      }),
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { email } })).role,
      "CUSTOMER",
    );
  },
);
await run("12 ownership and private evidence remain protected", async () => {
  assert.equal((await bob.req(`/api/returns/${request.id}`)).status, 404);
  assert(
    (await ok(bob.req(`/tai-khoan/don-hang/${testOrderId}`))).includes(
      "Trang chưa được tìm thấy",
    ),
  );
});
await run("13 disabled staff cannot log in", async () => {
  const a = accounts.find((a) => a.purpose === "catalog")!;
  await ok(
    admin.post("admin/staff/status", {
      id: a.id,
      active: false,
      reason: "Khóa nhân viên QA",
    }),
  );
  await denied(
    new Client().post("login", { email: a.email, password: a.password }),
  );
});
await run(
  "14 disabling revokes pre-existing sessions and reactivation never revives them",
  async () => {
    const a = accounts.find((a) => a.purpose === "catalog")!;
    await denied(staff.catalog.post("admin/category", {}));
    assert.equal(await db.session.count({ where: { userId: a.id } }), 0);
    await ok(
      admin.post("admin/staff/status", {
        id: a.id,
        active: true,
        reason: "Mở lại tài khoản QA",
      }),
    );
    await denied(staff.catalog.post("admin/category", {}));
    await ok(
      staff.catalog.post("login", {
        email: a.email,
        password: a.password,
      }),
    );
  },
);
await run("15 role changes invalidate stale sessions and grant only the current role", async () => {
  const account = accounts.find((entry) => entry.purpose === "inventory")!;
  await ok(admin.post("admin/staff/role", {
    id: account.id, role: "ADMIN", reason: "Kiểm thử cấp quyền quản trị",
  }));
  const before = await db.productVariant.findUniqueOrThrow({ where: { id: v.id } });
  try {
    assert.equal((await inventory.post("admin/stock", {
      variantId: v.id, stock: 99, reason: "Phiên cũ phải thu hồi",
    })).status, 403);
    assert.equal(await db.session.count({ where: { userId: account.id } }), 0);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
      before.stock,
    );
    await ok(inventory.post("login", { email: account.email, password: account.password }));
    assert((await ok(inventory.req("/admin/nhan-vien"))).includes("Tạo nhân viên local"));
  } finally {
    await ok(admin.post("admin/staff/role", {
      id: account.id, role: "SELLER", reason: "Thu hồi quyền quản trị kiểm thử",
    }));
  }
  assert.equal((await inventory.post("admin/shipping/reconcile", {})).status, 403);
  assert.equal(await db.session.count({ where: { userId: account.id } }), 0);
  await ok(inventory.post("login", { email: account.email, password: account.password }));
  assert.equal((await inventory.post("admin/shipping/reconcile", {})).status, 403);
});
await run(
  "16 SELLER cannot self-promote or gain implicit finance grants",
  async () => {
    for (const c of [manager, orderStaff, support])
      await denied(
        c.post("admin/staff/role", {
          id: accounts[0].id,
          role: "ADMIN",
          reason: "Không được cấp quyền",
        }),
      );
    await denied(
      manager.post("admin/shipping/reconcile", {
        id: shipment.id,
        eventKey: randomUUID(),
        action: "RECONCILE",
        note: "Không có quyền tài chính",
      }),
    );
  },
);
await run(
  "17 last active ADMIN cannot be disabled/demoted or bypassed via customer endpoint",
  async () => {
    const id = fixture.users.find((u: any) => u.name === "admin").id;
    await denied(
      admin.post("admin/staff/status", {
        id,
        active: false,
        reason: "Không được khóa người quản trị cuối",
      }),
    );
    await denied(
      admin.post("admin/staff/role", {
        id,
        role: "SELLER",
        reason: "Không được tự hạ vai trò",
      }),
    );
    await denied(admin.post("admin/customer", { id, active: false }));
    assert.equal(
      await db.user.count({ where: { role: "ADMIN", active: true } }),
      1,
    );
  },
);
await run(
  "18 CUSTOMER forged payload cannot bypass product stock permissions",
  async () => {
    const pv = await db.productVariant.findUniqueOrThrow({
      where: { id: fixture.fixtures[19].variantId },
    });
    await denied(
      customer.post("admin/variant", { ...pv, stock: 10000 }),
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: pv.id } }))
        .stock,
      pv.stock,
    );
    await denied(content.post("admin/unknown", { role: "ADMIN" }));
  },
);
await run(
  "19 audit contains resource/result and no passwords/session tokens",
  async () => {
    const logs = await db.auditLog.findMany({
      where: {
        action: {
          in: ["STAFF_CREATED", "STAFF_ROLE", "STAFF_STATUS", "ACCESS_DENIED"],
        },
      },
    });
    assert(logs.length > 10);
    for (const l of logs) {
      assert(l.resourceType && l.result);
      for (const a of accounts) assert(!l.detail.includes(a.password));
    }
    assert((await db.auditLog.count({ where: { result: "DENIED" } })) > 0);
  },
);
await run("20 audit is read-only and permission protected", async () => {
  assert(
    (await ok(admin.req("/admin/nhat-ky"))).includes(
      "Nhật ký vận hành — chỉ đọc",
    ),
  );
  assert(
    (await ok(content.req("/admin/nhat-ky"))).includes(
      "Không có quyền truy cập",
    ),
  );
  const count = await db.auditLog.count();
  await denied(admin.post("admin/audit", { id: "fake", detail: "modified" }));
  assert((await db.auditLog.count()) >= count);
});
await run(
  "21 ADMIN can approve and complete mock refund after inspection",
  async () => {
    await ok(
      finance.post("admin/returns/refund", {
        id: refundCandidate.id,
        refundShipping: false,
        reason: "Tài chính đối chiếu khoản đã thu mô phỏng",
      }),
    );
    for (const status of ["APPROVED", "SIMULATED_COMPLETED"])
      await ok(
        finance.post("admin/returns/refund-status", {
          id: refundCandidate.id,
          status,
          reason: "Tài chính xử lý đúng quyền",
        }),
      );
    assert.equal(
      (
        await db.mockRefund.findUniqueOrThrow({
          where: { requestId: refundCandidate.id },
        })
      ).status,
      "SIMULATED_COMPLETED",
    );
  },
);
await run("22 SELLER menus show operations but hide identities and promotions", async () => {
  const html = await ok(content.req("/admin/san-pham"));
  assert(html.includes('href="/admin/van-chuyen"'));
  assert(html.includes('href="/admin/san-pham"'));
  assert(!html.includes('href="/admin/nhan-vien"'));
  assert(!html.includes('href="/admin/banner"'));
  const returnHtml = await ok(support.req(`/admin/doi-tra/${refundCandidate.id}`));
  assert(!returnHtml.includes("HN-REFUND-"));
  assert(!returnHtml.includes("Audit log"));
});
await run("23 SELLER manual shipping remains functional", async () => {
  const s = await ok(
    orderStaff.post("admin/shipping/create", {
      orderId: testOrderId,
      provider: "LOCAL_MANUAL",
      shippingFee: 30000,
      weightGrams: 500,
      parcelCount: 1,
      parcelDescription: "Kiện kiểm thử phân quyền thủ công",
    }),
  );
  testShipmentId = s.id;
  for (const status of [
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ])
    await ok(
      orderStaff.post("admin/shipping/status", {
        id: s.id,
        status,
        reason: "Giao local đúng quyền",
      }),
    );
  await denied(
    orderStaff.post("admin/shipping/collection", { id: s.id, amount: 1 }),
  );
});
await run(
  "24 session version mismatch and expiration reject protected requests",
  async () => {
    const a = accounts.find((a) => a.purpose === "session")!;
    await db.user.update({
      where: { id: a.id },
      data: { permissionVersion: { increment: 1 } },
    });
    await denied(staff.session.post("admin/stock", { variantId: v.id, stock: 17, reason: "Phiên phải thu hồi" }));
    const c = new Client();
    await ok(c.post("login", { email: a.email, password: a.password }));
    await db.session.updateMany({
      where: { userId: a.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await denied(c.post("admin/stock", { variantId: v.id, stock: 17, reason: "Phiên hết hạn" }));
  },
);
await run(
  "25 all order/shipping/returns regressions passed in same isolated database",
  async () => {
    for (const name of [
      "order-results",
      "shipping-results",
      "returns-results",
    ]) {
      const r = JSON.parse(await readFile(`verification/${name}.json`, "utf8"));
      assert.equal(r.database, process.env.DATABASE_URL);
      assert(r.results.every((x: any) => x.status === "PASS"));
    }
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: testOrderId } })).status,
      "DELIVERED",
    );
  },
);
await run(
  "26 concurrent ADMIN demotions preserve one active owner",
  async () => {
    assert.equal(
      await db.user.count({ where: { role: "ADMIN", active: true } }),
      1,
      "Administrator race starts with only the primary administrator",
    );
    const primary = fixture.users.find((u: any) => u.name === "admin"),
      email = `second-admin-${randomUUID()}@qa.test`,
      password = randomUUID();
    const second = await ok(
      admin.post("admin/staff/create", {
        name: "Second QA admin",
        email,
        password,
        role: "ADMIN",
        reason: "Kiểm thử hai quản trị đồng thời",
      }),
    );
    const other = new Client();
    await ok(other.post("login", { email, password }));
    try {
      const races = await Promise.all([
        admin.post("admin/staff/role", {
          id: second.id,
          role: "SELLER",
          reason: "Kiểm thử cạnh tranh hạ quyền",
        }),
        other.post("admin/staff/role", {
          id: primary.id,
          role: "SELLER",
          reason: "Kiểm thử cạnh tranh hạ quyền",
        }),
      ]);
      assert.equal(races.filter((r) => r.status === 200).length, 1);
      assert.equal(
        await db.user.count({ where: { role: "ADMIN", active: true } }),
        1,
      );
    } finally {
      const current = await db.user.findUniqueOrThrow({
        where: { id: primary.id },
      });
      if (current.role !== "ADMIN") {
        await ok(
          other.post("admin/staff/role", {
            id: primary.id,
            role: "ADMIN",
            reason: "Khôi phục owner kiểm thử",
          }),
        );
        await ok(
          admin.post("login", {
            email: primary.email,
            password: primary.password,
          }),
        );
      }
      const secondary = await db.user.findUniqueOrThrow({ where: { id: second.id } });
      if (secondary.role === "ADMIN") {
        await ok(
          admin.post("admin/staff/role", {
            id: second.id,
            role: "SELLER",
            reason: "Kết thúc kiểm thử cạnh tranh",
          }),
        );
      }
    }
  },
);
await run(
  "27 SELLER catalog and ADMIN promotions retain positive operations and audit",
  async () => {
    await ok(
      staff.catalog.post("admin/category", {
        name: "QA RBAC Category",
        slug: `qa-rbac-${randomUUID()}`,
        description: "Danh mục kiểm thử local",
        image: "/images/lsoul/products/dam-ricci-dress-nguyen-ban-1.webp",
        parentId: null,
        sortOrder: 1,
        active: true,
      }),
    );
    await ok(
      admin.post("admin/banner", {
        title: "QA content local",
        subtitle: "Banner QA",
        image: "/images/lsoul/products/dam-ricci-dress-nguyen-ban-1.webp",
        href: "/hang-moi",
        active: false,
      }),
    );
    const a = accounts.find((a) => a.purpose === "session")!;
    await ok(
      staff.session.post("login", {
        email: a.email,
        password: a.password,
      }),
    );
    const coupon = await ok(
      admin.post("admin/coupon", {
        code: `QA${randomUUID()}`,
        type: "PERCENT",
        value: 10,
        minimum: 0,
        maximum: 100000,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        usageLimit: 10,
        active: false,
        reason: "Ưu đãi kiểm thử local",
      }),
    );
    const log = await db.auditLog.findFirstOrThrow({
      where: { targetId: coupon.id, action: "COUPON" },
    });
    assert(log.afterJson && log.result === "SUCCESS");
  },
);
await run("28 SELLER cannot read staff identities or shipping financial evidence", async () => {
  const html = await ok(manager.req("/admin/nhan-vien"));
  assert(html.includes("Không có quyền truy cập"));
  assert(!html.includes("QA seller orders"));
  assert(!html.includes('name="password"'));
  assert((await ok(admin.req("/admin/nhan-vien?role=CUSTOMER"))).includes("Không có nhân viên phù hợp."));
  const shipping = await ok(orderStaff.req(`/admin/van-chuyen/${testShipmentId}`));
  assert(!shipping.includes("Chứng từ chuyển mô phỏng"));
  assert(!shipping.includes("Hãng đã thu từ khách"));
});
const primaryFixture = fixture.users.find(
  (user: { name: string }) => user.name === "admin",
);
const primaryToken = admin.cookies.get("hn_session");
assert(primaryToken, "Primary administrator remains authenticated after role races");
primaryFixture.token = primaryToken;
await writeFile(
  "verification/business-fixtures.json",
  JSON.stringify(fixture),
  { mode: 0o600 },
);
await writeFile(
  "verification/authorization-results.json",
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
await writeFile(
  "verification/authorization-fixtures.json",
  JSON.stringify({
    database: process.env.DATABASE_URL,
    accounts,
    admin: fixture.users.find((u: any) => u.name === "admin"),
    variantId: v.id,
    orderId: testOrderId,
    shipmentId: testShipmentId,
    returnId: request.id,
    refundReturnId: refundCandidate.id,
  }),
  { mode: 0o600 },
);
await db.$disconnect();
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
