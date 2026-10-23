import { expect, type APIRequestContext } from "@playwright/test";
import { test, registerCustomer, browserDatabase, credentials } from "./fixtures";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
const searchResults = z.object({
  count: z.number().int().nonnegative(),
  products: z.array(z.object({ id: z.string() })),
});
const db = new PrismaClient({ datasources: { db: { url: browserDatabase } } });
const post = async (r: APIRequestContext, a: string, d: any) => {
  const res = await r.post("/api/" + a, { data: d });
  return { status: res.status(), data: await res.json() };
};
const customer = {
  name: "Khách Thử Nghiệm",
  phone: "0912345678",
  email: "customer@hanhi.test",
  province: "Hồ Chí Minh",
  ward: "Phường Sài Gòn",
  street: "123 Đường Thử Nghiệm",
  details: "Tầng 2",
  notes: "Đơn kiểm thử tự động",
};
async function variant() {
  return db.productVariant.findFirstOrThrow({
    where: { stock: { gte: 10 }, product: { active: true }, colorRecord: { active: true } },
    include: { product: true },
  });
}
async function login(r: APIRequestContext) {
  const res = await post(r, "login", { email: credentials.email, password: credentials.password });
  expect(res.status).toBe(200);
}
test.afterAll(() => db.$disconnect());
test("01 homepage and main navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Thiết kế dành cho nàng");
  await expect(
    page.locator(".fashion-product-section").first().locator(".product-card"),
  ).toHaveCount(8);
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page
    .locator(".drawer summary")
    .filter({ hasText: "Thời trang nữ" })
    .click();
  await page
    .locator(".drawer-category summary")
    .filter({ hasText: "Áo sơ mi" })
    .click();
  await page
    .locator(".drawer")
    .getByRole("link", { name: "Tất cả áo sơ mi", exact: true })
    .click();
  await expect(page).toHaveURL(/ao-so-mi/);
  await expect(page.locator(".catalog-grid .product-card")).toHaveCount(24);
});
test("02 seed distribution and foreign keys", async () => {
  expect(await db.product.count({ where: { sku: { startsWith: "HN" } } })).toBe(
    320,
  );
  const counts = await db.category.findMany({
    where: { parentId: null },
    include: { _count: { select: { products: true } } },
    orderBy: { slug: "asc" },
  });
  expect(counts.map((c) => c._count.products).filter(Boolean).sort((a, b) => a - b)).toEqual([
    20, 35, 35, 40, 45, 45, 45, 55,
  ]);
  const fk = await db.$queryRawUnsafe<any[]>("PRAGMA foreign_keys");
  expect(Number(fk[0].foreign_keys)).toBe(1);
});
test("03 all storefront and informational routes render", async ({
  request,
}) => {
  for (const route of [
    "/hang-moi",
    "/thoi-trang-cong-so",
    "/ao-so-mi",
    "/ao-kieu",
    "/ao-vest-blazer",
    "/quan-tay",
    "/chan-vay",
    "/dam-cong-so",
    "/set-cong-so",
    "/bo-suu-tap",
    "/bo-suu-tap/modern-office",
    "/sale",
    "/tim-kiem",
    "/yeu-thich",
    "/gio-hang",
    "/thanh-toan",
    "/dang-nhap",
    "/dang-ky",
    "/quen-mat-khau",
    "/gioi-thieu",
    "/lien-he",
    "/huong-dan-chon-size",
    "/chinh-sach-giao-hang",
    "/chinh-sach-doi-tra",
    "/chinh-sach-bao-mat",
    "/dieu-khoan-su-dung",
    "/tra-cuu-don-hang",
  ])
    expect((await request.get(route)).status(), route).toBe(200);
});
test("04 filters combine in database and URL", async ({ page, request }) => {
  await page.goto("/thoi-trang-cong-so");
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  const filters = page.getByRole("dialog", { name: "Bộ lọc sản phẩm" });
  await filters.getByLabel("Danh mục", { exact: true }).selectOption("ao-so-mi");
  await expect(page).toHaveURL(/category=ao-so-mi/);
  await filters.getByLabel("Chất liệu", { exact: true }).selectOption("Cotton");
  await expect(page).toHaveURL(/material=Cotton/);
  const res = searchResults.parse(await (
    await request.get(
      "/api/search?category=ao-so-mi&material=Cotton&size=M&stock=1&min=400000&max=700000",
    )
  ).json());
  expect(res.count).toBeGreaterThan(0);
  expect(res.products.length).toBeGreaterThan(0);
  const products = await db.product.findMany({
    where: { id: { in: res.products.map((p) => p.id) } },
    include: { category: true, variants: { include: { colorRecord: true } } },
  });
  expect(products).toHaveLength(res.products.length);
  for (const p of products) {
    expect(p.material).toBe("Cotton");
    expect(p.category.slug).toBe("ao-so-mi");
    expect(p.salePrice ?? p.price).toBeGreaterThanOrEqual(400000);
    expect(p.salePrice ?? p.price).toBeLessThanOrEqual(700000);
    expect(p.variants.some((v) => v.size === "M" && v.stock > 0 && (!v.colorRecord || v.colorRecord.active))).toBe(true);
  }
});
test("05 actual discounted price sorting", async ({ request }) => {
  for (const sort of ["price-asc", "price-desc"]) {
    const r = await (await request.get("/api/search?sort=" + sort)).json();
    const prices = r.products.map((p: any) => p.salePrice ?? p.price);
    expect(prices).toEqual(
      [...prices].sort((a, b) => (sort === "price-asc" ? a - b : b - a)),
    );
  }
});
test("06 accent-insensitive search and no-results", async ({
  page,
  request,
}) => {
  const r = await (
    await request.get("/api/search?q=ao%20so%20mi%20trang")
  ).json();
  expect(r.count).toBeGreaterThan(0);
  await page.goto("/tim-kiem?q=khongtontaixyz");
  await expect(page.getByText("Chưa có thiết kế phù hợp")).toBeVisible();
});
test("07 gallery, variants, disabled out-of-stock and add-to-cart", async ({
  page,
  gallery,
}) => {
  const p = await db.product.findUniqueOrThrow({ where: { sku: "HN001" } });
  await registerCustomer(page.request);
  await gallery([p.id]);
  await page.goto("/san-pham/" + p.slug);
  await expect(
    page
      .locator(".size-options")
      .getByRole("button", { name: "XS", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".size-options")
    .getByRole("button", { name: "M", exact: true })
    .click();
  await page
    .getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true })
    .click();
  await expect(
    page.getByText("Đã thêm thiết kế vào túi mua sắm."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ảnh tiếp theo" }).click();
  await page.getByRole("button", { name: "Phóng to ảnh" }).click();
  await expect(page.locator(".zoom-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/gio-hang");
  await expect(page.locator(".cart-item")).toHaveCount(1);
});
test("08 cart quantity update remove and stock rejection", async ({
  request,
}) => {
  await registerCustomer(request);
  const v = await variant();
  expect(
    (await post(request, "cart", { variantId: v.id, quantity: 2 })).status,
  ).toBe(200);
  expect(
    (await post(request, "cart", { variantId: v.id, quantity: 3 })).status,
  ).toBe(200);
  const cart = await (await request.get("/api/cart")).json();
  expect(cart.items[0].quantity).toBe(3);
  expect(
    (await post(request, "cart", { variantId: v.id, quantity: 99 })).status,
  ).toBe(400);
  await post(request, "cart", { variantId: v.id, quantity: 0 });
  expect((await (await request.get("/api/cart")).json()).items).toHaveLength(0);
});
test("09 server rejects out-of-stock variant", async ({ request }) => {
  await registerCustomer(request);
  const v = await db.productVariant.findFirstOrThrow({ where: { stock: 0 } });
  expect(
    (await post(request, "cart", { variantId: v.id, quantity: 1 })).status,
  ).toBe(400);
});
test("10 COD checkout, authoritative price, duplicate protection and privacy", async ({
  request,
  browser, baseURL,
}) => {
  const owner = await registerCustomer(request);
  const v = await variant();
  const before = v.stock;
  await post(request, "cart", { variantId: v.id, quantity: 2 });
  const key = crypto.randomUUID();
  const payload = {
    ...customer,
    idempotencyKey: key,
    total: 1,
    price: 1,
    paymentStatus: "PAID",
  };
  const a = await post(request, "checkout", payload);
  expect(a.status).toBe(200);
  const b = await post(request, "checkout", payload);
  expect(b.data.redirect).toBe(a.data.redirect);
  const order = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
    include: { items: true },
  });
  expect(order.paymentStatus).toBe("UNPAID");
  const subtotal = (v.priceOverride ?? v.product.salePrice ?? v.product.price) * 2;
  expect(order.subtotal).toBe(subtotal);
  expect(order.total).toBe(subtotal + (subtotal >= 1000000 ? 0 : 30000));
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
  ).toBe(before - 2);
  expect((await request.get(a.data.redirect)).status()).toBe(200);
  const stranger = await browser.newContext({ baseURL });
  try {
    // A historical account-order cookie must not remain a bearer capability.
    await stranger.addCookies([{
      name: `hn_order_${order.code}`, value: order.accessToken, url: baseURL!,
    }]);
    expect(await (await stranger.request.get(a.data.redirect)).text())
      .toContain("Trang chưa được tìm thấy");
    await registerCustomer(stranger.request);
    expect(await (await stranger.request.get(a.data.redirect)).text())
      .toContain("Trang chưa được tìm thấy");
    expect((await post(stranger.request, "order/cancel", {
      id: order.id, code: order.code, reason: "Không phải chủ đơn hàng",
    })).status).toBe(400);
  } finally {
    await stranger.close();
  }
  await post(request, "logout", {});
  expect(await (await request.get(a.data.redirect)).text()).toContain("Trang chưa được tìm thấy");
  expect((await post(request, "order/cancel", {
    id: order.id, code: order.code, reason: "Phiên chủ đơn đã đăng xuất",
  })).status).toBe(400);
  expect((await post(request, "login", owner)).status).toBe(200);
  expect(await (await request.get(a.data.redirect)).text()).toContain(order.code);
});
test("11 admin dashboard and all management routes", async ({ request }) => {
  await login(request);
  for (const route of [
    "/admin",
    "/admin/san-pham",
    "/admin/danh-muc",
    "/admin/bo-suu-tap",
    "/admin/don-hang",
    "/admin/khach-hang",
    "/admin/kho-hang",
    "/admin/ma-giam-gia",
    "/admin/banner",
    "/admin/phan-tich/reports",
    "/admin/cai-dat",
  ])
    expect((await request.get(route)).status(), route).toBe(200);
  const html = await (await request.get("/admin")).text();
  expect(html).toContain("Báo cáo");
});
test("12 valid order status transitions, cancel restores stock once", async ({
  request,
}) => {
  await login(request);
  const o = await db.order.findFirstOrThrow({
    where: { status: "PENDING" },
    include: { items: true },
  });
  const v = await db.productVariant.findUniqueOrThrow({
    where: { id: o.items[0].variantId },
  });
  expect(
    (await post(request, "admin/order", { id: o.id, status: "COMPLETED" }))
      .status,
  ).toBe(400);
  expect(
    (await post(request, "admin/order", { id: o.id, status: "CONFIRMED" }))
      .status,
  ).toBe(200);
  expect(
    (await post(request, "admin/order", {
      id: o.id, status: "CANCELLED", reason: "Khách xác nhận hủy đơn kiểm thử",
    }))
      .status,
  ).toBe(200);
  expect(
    (await post(request, "admin/order", { id: o.id, status: "CANCELLED" }))
      .status,
  ).toBe(200);
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
  ).toBe(v.stock + o.items[0].quantity);
});
test("13 registration, login and customer order history", async ({
  request,
  page,
}) => {
  const password = "Customer-test-" + crypto.randomUUID();
  const email = `member-${crypto.randomUUID()}@hanhi.test`;
  const reg = await post(request, "register", {
    ...customer,
    email,
    password,
    confirmPassword: password,
  });
  expect(reg.status).toBe(200);
  const v = await variant();
  await post(request, "cart", { variantId: v.id, quantity: 1 });
  const order = await post(request, "checkout", {
    ...customer,
    email,
    idempotencyKey: crypto.randomUUID(),
  });
  expect(order.status).toBe(200);
  await post(request, "logout", {});
  expect((await post(request, "login", { email, password })).status).toBe(200);
  expect(await (await request.get("/tai-khoan/don-hang")).text()).toContain(
    "HN-",
  );
  const member = await db.user.findUniqueOrThrow({ where: { email } });
  expect(member.passwordHash).not.toContain(password);
  void page;
});
test("14 unauthorized admin mutations and cross-origin requests denied", async ({
  request,
}) => {
  const res = await post(request, "admin/settings", { announcement: "ATTACK" });
  expect(res.status).toBe(403);
  const r = await request.post("/api/register", {
    data: {},
    headers: { Origin: "https://evil.example" },
  });
  expect(r.status()).toBe(400);
});
test("15 admin create edit archive product and inventory", async ({
  request, page,
}) => {
  await login(request);
  const category = await db.category.findUniqueOrThrow({ where: { slug: "ao-so-mi" } });
  const marker = "qa-" + crypto.randomUUID();
  const payload = {
    name: "Áo thử nghiệm quản trị",
    slug: marker,
    sku: "",
    description: "Sản phẩm kiểm thử được tạo qua API quản trị.",
    categoryId: category.id,
    material: "Cotton",
    style: "Thanh lịch",
    fit: "Regular Fit",
    occasion: "Daily Office",
    price: 690000,
    salePrice: null,
    active: true,
    featured: false,
    isNew: true,
    image: "/images/awaiting-photo.svg",
  };
  try {
    const r = await post(request, "admin/product", payload);
    expect(r.status).toBe(200);
    expect((await request.get("/san-pham/" + payload.slug)).status()).toBe(200);
    const p = await db.product.findUniqueOrThrow({
      where: { id: r.data.id },
      include: { variants: true },
    });
    expect(p.sku).toMatch(/^HN-TP-\d{4}$/);
    expect((await post(request, "admin/stock", {
      variantId: p.variants[0].id, stock: 15, reason: "QA nhập kho",
    })).status).toBe(200);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: p.variants[0].id } })).stock).toBe(15);
    expect((await post(request, "admin/stock", {
      variantId: p.variants[0].id, stock: -1, reason: "QA âm",
    })).status).toBe(400);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: p.variants[0].id } })).stock).toBe(15);
    const edited = { ...payload, id: p.id, sku: p.sku, name: "Áo quản trị đã cập nhật", price: 720000 };
    expect((await post(request, "admin/product", edited)).status).toBe(200);
    expect(await db.product.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({
      name: edited.name, price: edited.price, active: true,
    });
    const visible = searchResults.parse(await (await request.get("/api/search?q=" + encodeURIComponent(p.sku))).json());
    expect(visible.products.map((product) => product.id)).toContain(p.id);
    // Historical identifiers must survive metadata edits without renumbering stock.
    const legacySku = "LEGACY-" + marker;
    await db.product.update({ where: { id: p.id }, data: { sku: legacySku } });
    const preserved = { ...edited, sku: legacySku, price: 725000 };
    expect((await post(request, "admin/product", preserved)).status).toBe(200);
    expect((await post(request, "admin/product", {
      ...preserved, sku: "INVALID-CHANGE", price: 1,
    })).status).toBe(400);
    expect(await db.product.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({
      sku: legacySku, price: preserved.price,
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: p.variants[0].id } })).sku).toBe(p.variants[0].sku);
    expect((await post(request, "admin/product", { ...preserved, active: false })).status).toBe(200);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).active).toBe(false);
    const archived = searchResults.parse(await (await request.get("/api/search?q=" + encodeURIComponent(legacySku))).json());
    expect(archived.products).toHaveLength(0);
    await page.goto("/san-pham/" + payload.slug);
    await expect(page.getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true })).toHaveCount(0);
  } finally {
    await db.$transaction(async (tx) => {
      const fixture = await tx.product.findUnique({ where: { slug: marker } });
      if (!fixture) return;
      await tx.inventoryMovement.deleteMany({ where: { variant: { productId: fixture.id } } });
      await tx.productVariant.deleteMany({ where: { productId: fixture.id } });
      await tx.product.delete({ where: { id: fixture.id } });
    });
  }
});
test("16 coupon validity and usage limits", async ({ request }) => {
  await registerCustomer(request);
  const v = await variant();
  expect((await post(request, "cart", { variantId: v.id, quantity: 3 })).status).toBe(200);
  const bad = await post(request, "quote", { coupon: "INVALID" });
  expect(bad.status).toBe(400);
  const q = await post(request, "quote", { coupon: "CHAO10" });
  expect(q.status).toBe(200);
  expect(q.data.discount).toBe(
    Math.min(Math.floor(q.data.subtotal * 0.1), 200000),
  );
  const limited = await db.coupon.create({
    data: {
      code: ("LIMIT-" + crypto.randomUUID()).toUpperCase(), type: "FIXED", value: 50000,
      minimum: 0, maximum: null, expiresAt: new Date(Date.now() + 86400000),
      usageLimit: 1, active: true,
    },
  });
  const couponIds = [limited.id];
  try {
    for (const data of [
      { expiresAt: new Date(Date.now() - 86400000) },
      { active: false },
      { minimum: q.data.subtotal + 1 },
      { used: 1 },
    ]) {
      const invalid = await db.coupon.create({
        data: { ...limited, id: crypto.randomUUID(), code: ("INVALID-" + crypto.randomUUID()).toUpperCase(), ...data },
      });
      couponIds.push(invalid.id);
      expect((await post(request, "quote", { coupon: invalid.code })).status).toBe(400);
    }
    const quoted = await post(request, "quote", { coupon: limited.code.toLowerCase() });
    expect(quoted.status).toBe(200);
    expect(quoted.data.discount).toBe(50000);
    const key = crypto.randomUUID();
    expect((await post(request, "checkout", {
      ...customer, coupon: limited.code, idempotencyKey: key,
    })).status).toBe(200);
    const order = await db.order.findUniqueOrThrow({ where: { idempotencyKey: key } });
    expect(order.discount).toBe(50000);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: limited.id } })).used).toBe(1);
    expect((await post(request, "cart", { variantId: v.id, quantity: 1 })).status).toBe(200);
    expect((await post(request, "quote", { coupon: limited.code })).status).toBe(400);
    expect((await post(request, "order/cancel", {
      id: order.id, reason: "Khách hủy đơn kiểm thử hoàn lượt voucher",
    })).status).toBe(200);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: limited.id } })).used).toBe(0);
    expect((await post(request, "quote", { coupon: limited.code })).status).toBe(200);
  } finally {
    await db.$transaction([
      db.couponRedemption.deleteMany({ where: { couponId: { in: couponIds } } }),
      db.coupon.deleteMany({ where: { id: { in: couponIds } } }),
    ]);
  }
});
test("17 guest wishlist persists and merges on registration", async ({
  page,
}) => {
  await page.goto("/hang-moi");
  const wish = page.locator(".product-card .wish").first();
  await wish.click();
  await expect(wish).toHaveAttribute("aria-pressed", "true");
  await expect(wish).toBeEnabled();
  await page.goto("/yeu-thich");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.goto("/dang-ky");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Khách Yêu Thích");
  await page.locator('input[name="email"]').fill(`wishlist-${crypto.randomUUID()}@hanhi.test`);
  await page.locator('input[name="phone"]').fill("0912345678");
  const password = `Wishlist-${crypto.randomUUID()}`;
  await page.locator('input[name="password"]').fill(password);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(password);
  const registered = page.waitForResponse((response) =>
    response.url().endsWith("/api/register") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "TẠO TÀI KHOẢN" }).click();
  expect((await registered).status()).toBe(200);
  await page.getByRole("button", { name: "TẠO TÀI KHOẢN" }).waitFor({ state: "detached" });
  await page.goto("/yeu-thich");
  await expect(page.locator(".product-card")).toHaveCount(1);
});
test("18 mobile menu and checkout flow", async ({ page }) => {
  await registerCustomer(page.request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(page.locator(".drawer")).toBeVisible();
  await page
    .locator(".drawer summary")
    .filter({ hasText: "Thời trang nữ" })
    .click();
  await page
    .locator(".drawer-category summary")
    .filter({ hasText: "Áo sơ mi" })
    .click();
  await page
    .locator(".drawer")
    .getByRole("link", { name: "Tất cả áo sơ mi", exact: true })
    .click();
  await expect(page).toHaveURL(/ao-so-mi/);
  await page.locator(".product-card .product-name").first().click();
  await page
    .locator(".size-options")
    .getByRole("button", { name: "M", exact: true })
    .click();
  await page.getByRole("button", { name: "MUA NGAY", exact: true }).click();
  await expect(page).toHaveURL(/thanh-toan/);
  for (const [label, value] of [
    ["Họ và tên", "Khách Mobile"],
    ["Số điện thoại", "0912345678"],
    ["Địa chỉ email", "mobile@hanhi.test"],
    ["Tỉnh / Thành phố", "Hồ Chí Minh"],
    ["Phường / Xã", "Sài Gòn"],
    ["Số nhà, tên đường", "123 Đường Test"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "ĐẶT HÀNG COD" }).click();
  await expect(page).toHaveURL(/dat-hang-thanh-cong/);
  await expect(
    page.getByText("Đơn hàng đã được lưu thành công.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("19 responsive homepage at every requested width", async ({ page }) => {
  for (const width of [375, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
  }
});
test("20 address ownership, profile and local password reset", async ({
  request,
  browser, baseURL,
}) => {
  const password = `Address-${crypto.randomUUID()}`;
  const email = `address-${crypto.randomUUID()}@hanhi.test`;
  await post(request, "register", {
    ...customer,
    email,
    password,
    confirmPassword: password,
  });
  expect((await post(request, "address", customer)).status).toBe(200);
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const address = await db.address.findFirstOrThrow({
    where: { userId: user.id },
  });
  const stranger = await browser.newContext({ baseURL });
  try {
    await registerCustomer(stranger.request);
    expect((await post(stranger.request, "address", { id: address.id, delete: true })).status).toBe(400);
    expect(await db.address.count({ where: { id: address.id } })).toBe(1);
  } finally {
    await stranger.close();
  }
  const reset = await post(request, "forgot", { email });
  expect(reset.status).toBe(200);
  expect(
    (await db.passwordReset.findFirst({ where: { email } }))?.tokenHash,
  ).toHaveLength(64);
});
test("21 admin category collection coupon and content persistence", async ({
  request,
}) => {
  await login(request);
  const c = await post(request, "admin/category", {
    name: "Danh mục QA",
    slug: "qa-category",
    description: "Danh mục kiểm thử quản trị",
    image: "/images/awaiting-photo.svg",
  });
  expect(c.status).toBe(200);
  expect((await request.get("/qa-category")).status()).toBe(200);
  expect(
    (
      await post(request, "admin/collection", {
        name: "QA Collection",
        slug: "qa-collection",
        description: "Bộ sưu tập kiểm thử",
        image: "/images/awaiting-photo.svg",
        productIds: [],
      })
    ).status,
  ).toBe(200);
  expect(
    (await post(request, "admin/settings", { contactPhone: "0900000001" }))
      .status,
  ).toBe(200);
  expect(
    (
      await post(request, "admin/coupon", {
        code: "QA20",
        type: "PERCENT",
        value: 20,
        minimum: 500000,
        maximum: 100000,
        expiresAt: "2029-01-01",
        usageLimit: 2,
        active: true,
      })
    ).status,
  ).toBe(200);
});
test("22 payment recording requires delivered order", async ({ request }) => {
  await login(request);
  const o = await db.order.findFirstOrThrow({ where: { status: "PENDING" } });
  expect(
    (
      await post(request, "admin/order", {
        id: o.id,
        status: "PENDING",
        paid: true,
      })
    ).status,
  ).toBe(400);
  for (const status of ["CONFIRMED", "PROCESSING"]) {
    expect(
      (await post(request, "admin/order", { id: o.id, status })).status,
    ).toBe(200);
  }
  const items = await db.orderItem.findMany({ where: { orderId: o.id } });
  expect(
    (await post(request, "admin/order/pack", {
      id: o.id, eventKey: crypto.randomUUID(), kind: "PACK",
      reason: "Đã kiểm và đóng gói đơn kiểm thử",
      items: items.map((item) => ({ id: item.id, quantity: item.quantity, checked: true })),
    })).status,
  ).toBe(200);
  for (const status of ["SHIPPING", "DELIVERED"]) {
    expect(
      (await post(request, "admin/order", {
        id: o.id, status, reason: "Ghi nhận giao nhận nội bộ kiểm thử", reference: "QA-MANUAL-DELIVERY",
      })).status,
    ).toBe(200);
  }
  expect(
    (
      await post(request, "admin/order", {
        id: o.id,
        status: "DELIVERED",
        paid: true,
        reason: "Xác nhận đã thực nhận COD nội bộ kiểm thử",
        reference: "QA-COD-COLLECTED",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await post(request, "admin/order", {
        id: o.id,
        status: "DELIVERED",
        paid: true,
      })
    ).status,
  ).toBe(200);
  expect(
    (await db.order.findUniqueOrThrow({ where: { id: o.id } })).paymentStatus,
  ).toBe("PAID");
});
test("23 mobile filter drawer keyboard and combined filtering", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/thoi-trang-cong-so");
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await expect(page.locator(".filter-dialog")).toBeVisible();
  await page
    .locator(".filter-dialog")
    .getByLabel("Danh mục", { exact: true })
    .selectOption("quan-tay");
  await expect(page).toHaveURL(/category=quan-tay/);
  await page
    .locator(".filter-dialog")
    .getByRole("button", { name: "M", exact: true })
    .click();
  await expect(page).toHaveURL(/size=M/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".filter-dialog")).not.toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(24);
});
test("24 concurrent orders never oversell the final unit", async ({
  browser, baseURL,
}) => {
  const v = await variant();
  await db.productVariant.update({ where: { id: v.id }, data: { stock: 1 } });
  const a = await browser.newContext({ baseURL });
  const b = await browser.newContext({ baseURL });
  await registerCustomer(a.request);
  await registerCustomer(b.request);
  await post(a.request, "cart", { variantId: v.id, quantity: 1 });
  await post(b.request, "cart", { variantId: v.id, quantity: 1 });
  const keys = [crypto.randomUUID(), crypto.randomUUID()];
  const result = await Promise.all([
    post(a.request, "checkout", { ...customer, idempotencyKey: keys[0] }),
    post(b.request, "checkout", { ...customer, idempotencyKey: keys[1] }),
  ]);
  expect(result.filter((r) => r.status === 200)).toHaveLength(1);
  expect(
    await db.order.count({ where: { idempotencyKey: { in: keys } } }),
  ).toBe(1);
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
  ).toBe(0);
  await a.close();
  await b.close();
});
test("25 legacy guest cart merge, guest mutation denial and empty checkout validation", async ({
  request,
}) => {
  const v = await variant();
  expect((await post(request, "cart", { variantId: v.id, quantity: 2 })).status).toBe(401);
  const legacy = await (await request.get("/api/cart")).json();
  await db.cartItem.create({ data: { cartId: legacy.id, variantId: v.id, quantity: 2 } });
  const email = `merge-${crypto.randomUUID()}@hanhi.test`;
  const password = `Merge-${crypto.randomUUID()}`;
  expect(
    (
      await post(request, "register", {
        ...customer,
        email,
        password,
        confirmPassword: password,
      })
    ).status,
  ).toBe(200);
  expect(
    (await (await request.get("/api/cart")).json()).items[0].quantity,
  ).toBe(2);
  await post(request, "logout", {});
  expect((await post(request, "cart", { variantId: v.id, quantity: 1 })).status).toBe(401);
  const legacyAgain = await (await request.get("/api/cart")).json();
  await db.cartItem.create({ data: { cartId: legacyAgain.id, variantId: v.id, quantity: 1 } });
  await post(request, "login", { email, password });
  expect(
    (await (await request.get("/api/cart")).json()).items[0].quantity,
  ).toBe(3);
  await post(request, "cart", { variantId: v.id, quantity: 0 });
  const before = await db.order.count();
  expect(
    (
      await post(request, "checkout", {
        ...customer,
        idempotencyKey: crypto.randomUUID(),
      })
    ).status,
  ).toBe(400);
  expect(await db.order.count()).toBe(before);
});
test("26 storefront and admin responsive content without overflow", async ({
  page,
}) => {
  await login(page.request);
  const v = await variant();
  await post(page.request, "cart", { variantId: v.id, quantity: 1 });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/thoi-trang-cong-so",
      "/san-pham/" + v.product.slug,
      "/gio-hang",
      "/thanh-toan",
      "/tai-khoan",
      "/admin",
      "/admin/san-pham",
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} @${width}`,
      ).toBeTruthy();
    }
  }
});
test("27 safe uploads and server validation", async ({ request }) => {
  await login(request);
  const bad = await request.post("/api/admin/upload", {
    multipart: {
      file: {
        name: "payload.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from('<svg onload="alert(1)"/>'),
      },
    },
  });
  expect(bad.status()).toBe(400);
  const webp = await sharp({
    create: { width: 48, height: 64, channels: 3, background: "#b5a18b" },
  }).webp().toBuffer();
  const good = await request.post("/api/admin/upload", {
    multipart: {
      file: { name: "campaign.webp", mimeType: "image/webp", buffer: webp },
    },
  });
  expect(good.status()).toBe(200);
  const { url } = z.object({ url: z.string().regex(/^\/uploads\/[a-f0-9]+\.webp$/) }).parse(await good.json());
  try {
    const uploaded = await request.get(url);
    expect(uploaded.headers()["content-type"]).toContain("image/webp");
    expect(uploaded.status()).toBe(200);
    expect((await sharp(await uploaded.body()).metadata())).toMatchObject({
      format: "webp", width: 48, height: 64,
    });
  } finally {
    await unlink("public" + url);
  }
});
test("28 password reset token is one-use and invalidates sessions", async ({
  request,
}) => {
  const { readdirSync } = await import("node:fs");
  const email = `reset-flow-${crypto.randomUUID()}@hanhi.test`;
  const password = `Original-${crypto.randomUUID()}`;
  expect((await post(request, "register", {
    name: customer.name,
    phone: customer.phone,
    email,
    password,
    confirmPassword: password,
  })).status).toBe(200);
  expect((await post(request, "forgot", { email })).status).toBe(200);
  const mailFile = readdirSync(".local-mail").find((file) =>
    readFileSync(".local-mail/" + file, "utf8").includes(email),
  );
  expect(mailFile).toBeTruthy();
  try {
    const mail = readFileSync(".local-mail/" + mailFile, "utf8");
    const match = mail.match(/token=([a-f0-9]{64})/);
    expect(match).not.toBeNull();
    const resetToken = match![1];
    const next = `Replacement-${crypto.randomUUID()}`;
    expect(
      (await post(request, "reset", { resetToken, password: next })).status,
    ).toBe(200);
    expect((await (await request.get("/api/session")).json()).user).toBeNull();
    expect(
      (await post(request, "reset", { resetToken, password: next })).status,
    ).toBe(400);
    expect((await post(request, "login", { email, password })).status).toBe(400);
    expect((await post(request, "login", { email, password: next })).status).toBe(200);
  } finally {
    await unlink(".local-mail/" + mailFile);
  }
});

test("29 aligned product prices", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const rows = await page
      .locator(".fashion-product-section")
      .first()
      .locator(".product-card")
      .evaluateAll((cards) =>
        cards.map((c) => ({
          top: c.getBoundingClientRect().top,
          price: c.querySelector(".price")!.getBoundingClientRect().top,
        })),
      );
    expect(rows.length).toBeGreaterThan(0);
    const groups = new Map<number, number[]>();
    for (const row of rows) {
      const key = Math.round(row.top);
      groups.set(key, [...(groups.get(key) ?? []), row.price]);
    }
    for (const values of groups.values())
      expect(Math.max(...values) - Math.min(...values)).toBeLessThan(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
test("30 hierarchical filtering and configured contact persistence", async ({
  request, page,
}) => {
  const roots = await db.category.findMany({
    where: {
      parentId: null,
      slug: {
        in: [
          "ao-so-mi",
          "ao-kieu",
          "ao-vest-blazer",
          "quan-tay",
          "chan-vay",
          "dam-cong-so",
          "set-cong-so",
          "ao-khoac-len",
        ],
      },
    },
    include: { children: true },
  });
  expect(roots).toHaveLength(8);
  expect(roots.reduce((n, c) => n + c.children.length, 0)).toBe(64);
  const product = await db.product.findFirstOrThrow({
    where: { subcategoryId: { not: null } },
    include: { subcategory: true, category: true },
  });
  const r = searchResults.parse(await (
    await request.get(
      "/api/search?category=" +
        product.category.slug +
        "&subcategory=" +
        product.subcategory!.slug,
    )
  ).json());
  expect(r.count).toBeGreaterThan(0);
  expect(r.products.length).toBeGreaterThan(0);
  const matchingProducts = await db.product.findMany({
    where: { id: { in: r.products.map((p) => p.id) } },
    select: { subcategoryId: true },
  });
  expect(matchingProducts).toHaveLength(r.products.length);
  expect(matchingProducts.every((p) => p.subcategoryId === product.subcategoryId)).toBe(true);
  const inquiryEmail = `inquiry-${crypto.randomUUID()}@hanhi.test`;
  const contact = await post(request, "contact", {
    name: "Khách liên hệ QA",
    email: inquiryEmail,
    phone: "0912345678",
    subject: "Tư vấn kích cỡ",
    message: "Tôi muốn được tư vấn kích cỡ phù hợp.",
  });
  try {
    expect(contact.status).toBe(200);
    expect(await db.inquiry.count({ where: { email: inquiryEmail } })).toBe(1);
    const contactPhone = await db.storeSetting.findUniqueOrThrow({ where: { key: "contactPhone" } });
    await page.goto("/lien-he");
    await expect(page.locator(`.contact-links a[href="tel:${contactPhone.value}"]`).first()).toBeVisible();
    await login(request);
    expect((await request.get("/admin/lien-he")).status()).toBe(200);
    const inquiry = await db.inquiry.findFirstOrThrow({ where: { email: inquiryEmail } });
    expect((await post(request, "admin/inquiry", {
      id: inquiry.id, status: "RESOLVED",
    })).status).toBe(200);
    expect((await db.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).status).toBe("RESOLVED");
  } finally {
    await db.inquiry.deleteMany({ where: { email: inquiryEmail } });
  }
});

test("31 actual collections remain reachable from navigation and collection cards", async ({ page }) => {
  const collections = await db.collection.findMany({ orderBy: { createdAt: "asc" } });
  expect(collections.length).toBeGreaterThan(0);
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.locator(".drawer summary").filter({ hasText: "Cảm hứng phối đồ" }).click();
  for (const collection of collections)
    await expect(page.locator(".drawer").getByRole("link", { name: collection.name, exact: true }))
      .toHaveAttribute("href", "/bo-suu-tap/" + collection.slug);
  await page.locator(".drawer").getByRole("link", { name: "Tất cả bộ sưu tập", exact: true }).click();
  await expect(page).toHaveURL(/\/bo-suu-tap$/);
  await expect(page.locator(".collections-grid > a")).toHaveCount(collections.length);
  await page.locator(".collections-grid > a").first().click();
  await expect(page).toHaveURL(new RegExp("/bo-suu-tap/" + collections[0].slug + "$"));
  await expect(page.locator("h1")).toHaveText(collections[0].name);
});

test("32 guests cannot mutate cart or checkout and login resumes the storefront", async ({ page }) => {
  const v = await variant();
  const before = await db.order.count();
  for (const action of ["quote", "checkout"]) {
    const response = await post(page.request, action, { ...customer, idempotencyKey: crypto.randomUUID() });
    expect(response.status).toBe(401);
    expect(response.data.redirect).toContain("/dang-nhap");
  }
  await page.goto("/san-pham/" + v.product.slug + "?mau=" + v.colorId);
  await page.locator(".size-options").getByRole("button", { name: v.size, exact: true }).click();
  await page.getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true }).click();
  await expect(page).toHaveURL(/\/dang-nhap\?returnTo=/);
  expect((await (await page.request.get("/api/cart")).json()).items).toHaveLength(0);
  expect(await db.order.count()).toBe(before);
  const account = await registerCustomer(page.request);
  await page.request.post("/api/logout", { data: {} });
  await page.getByLabel("Email hoặc số điện thoại", { exact: true }).fill(account.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/san-pham/" + v.product.slug + "$"));
  expect((await (await page.request.get("/api/session")).json()).user.role).toBe("CUSTOMER");
});

test("33 returned-order inspection is complete and restocks only sellable units once", async ({ page, request }) => {
  await registerCustomer(page.request);
  const v = await variant();
  expect((await post(page.request, "cart", { variantId: v.id, quantity: 2 })).status).toBe(200);
  const key = crypto.randomUUID();
  expect((await post(page.request, "checkout", { ...customer, idempotencyKey: key })).status).toBe(200);
  const order = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key }, include: { items: true },
  });
  await login(request);
  for (const status of ["CONFIRMED", "PROCESSING"])
    expect((await post(request, "admin/order", { id: order.id, status })).status).toBe(200);
  expect((await post(request, "admin/order/pack", {
    id: order.id, eventKey: crypto.randomUUID(), kind: "PACK",
    reason: "Kiểm đủ hàng chuyển hoàn thử nghiệm",
    items: order.items.map((item) => ({ id: item.id, quantity: item.quantity, checked: true })),
  })).status).toBe(200);
  for (const status of ["SHIPPING", "DELIVERY_FAILED", "RETURNED"])
    expect((await post(request, "admin/order", {
      id: order.id, status, reason: "Ghi nhận giao nhận kiểm thử nội bộ", reference: "TEST-RETURN",
    })).status).toBe(200);
  const returnedStock = (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock;
  expect((await post(request, "admin/order", {
    id: order.id, status: "CANCELLED", reason: "Thiếu kiểm nhận hàng hoàn",
  })).status).toBe(400);
  await login(page.request);
  await page.goto("/admin/don-hang/" + order.id);
  await page.getByLabel("Lý do xử lý đơn", { exact: true }).fill("Đã kiểm nhận: một hàng bán lại, một hàng hỏng");
  const cancel = page.locator(".order-actions").getByRole("button", { name: "Đã hủy", exact: true });
  await cancel.click();
  await expect(page.locator(".order-actions [role=alert]")).toBeVisible();
  expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("RETURNED");
  expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(returnedStock);
  await page.locator(".returned-inspection").getByLabel(/^Có thể bán/).fill("1");
  await page.locator(".returned-inspection").getByLabel(/^Hư hỏng/).fill("1");
  const committed = page.waitForResponse((response) => response.url().endsWith("/api/admin/order") && response.request().method() === "POST");
  await cancel.click();
  expect((await committed).status()).toBe(200);
  await expect(page.locator(".returned-inspection")).toHaveCount(0);
  expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "CANCELLED" });
  expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(returnedStock + 1);
  const movements = await db.inventoryMovement.count({ where: { orderId: order.id } });
  expect((await post(request, "admin/order", { id: order.id, status: "CANCELLED" })).status).toBe(200);
  expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(returnedStock + 1);
  expect(await db.inventoryMovement.count({ where: { orderId: order.id } })).toBe(movements);
  const audit = await db.auditLog.findFirstOrThrow({
    where: { targetId: order.id, action: "ORDER_STATUS", afterJson: { contains: '"returnedItems"' } },
  });
  expect(JSON.parse(audit.afterJson!)).toMatchObject({
    status: "CANCELLED",
    returnedItems: [{ orderItemId: order.items[0].id, sellableQuantity: 1, damagedQuantity: 1 }],
  });
});

test("34 customer return ownership and ADMIN-only staff evidence and decisions", async ({ page, request, browser, baseURL }) => {
  await registerCustomer(page.request);
  const v = await variant();
  expect((await post(page.request, "cart", { variantId: v.id, quantity: 1 })).status).toBe(200);
  const key = crypto.randomUUID();
  expect((await post(page.request, "checkout", { ...customer, idempotencyKey: key })).status).toBe(200);
  const order = await db.order.findUniqueOrThrow({ where: { idempotencyKey: key }, include: { items: true } });
  await login(request);
  for (const status of ["CONFIRMED", "PROCESSING"])
    expect((await post(request, "admin/order", { id: order.id, status })).status).toBe(200);
  expect((await post(request, "admin/order/pack", {
    id: order.id, eventKey: crypto.randomUUID(), kind: "PACK", reason: "Đóng gói đơn kiểm thử đổi trả",
    items: order.items.map((item) => ({ id: item.id, quantity: item.quantity, checked: true })),
  })).status).toBe(200);
  for (const status of ["SHIPPING", "DELIVERED"])
    expect((await post(request, "admin/order", {
      id: order.id, status, reason: "Giao nhận nội bộ kiểm thử", reference: "TEST-DELIVERED",
    })).status).toBe(200);
  const swatch = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#eeccbb" } }).png().toBuffer();
  const payload = {
    orderId: order.id, eventKey: crypto.randomUUID(), claimType: "DEFECT", resolution: "REFUND",
    reason: "Đường may lỗi trong tình huống kiểm thử",
    items: [{ orderItemId: order.items[0].id, quantity: 1 }],
    evidence: [{ data: "data:image/png;base64," + swatch.toString("base64") }],
  };
  const created = await post(page.request, "returns", payload);
  expect(created.status).toBe(200);
  expect((await post(page.request, "returns", payload)).data.id).toBe(created.data.id);
  const record = await db.returnRequest.findUniqueOrThrow({ where: { id: created.data.id }, include: { evidence: true } });
  const evidenceUrl = "/api/returns/evidence/" + record.evidence[0].id;
  expect((await page.request.get(evidenceUrl)).status()).toBe(200);
  const stranger = await browser.newContext({ baseURL });
  try {
    expect((await stranger.request.get(evidenceUrl)).status()).toBe(403);
    const seller = await registerCustomer(stranger.request);
    expect((await stranger.request.get(evidenceUrl)).status()).toBe(404);
    expect((await post(stranger.request, "returns", { ...payload, eventKey: crypto.randomUUID() })).status).toBe(400);
    await db.user.update({ where: { email: seller.email }, data: { role: "SELLER", permissionVersion: { increment: 1 } } });
    expect((await (await stranger.request.get("/api/session")).json()).user).toBeNull();
    expect((await post(stranger.request, "login", { email: seller.email, password: seller.password })).status).toBe(200);
    const sellerPage = await stranger.newPage();
    await sellerPage.goto("/admin/doi-tra/" + record.id);
    await expect(sellerPage.getByRole("heading", { name: record.reference })).toBeVisible();
    await expect(sellerPage.locator(".return-evidence")).toHaveCount(0);
    expect((await stranger.request.get(evidenceUrl)).status()).toBe(404);
    expect((await post(stranger.request, "admin/returns/status", {
      id: record.id, status: "UNDER_REVIEW", reason: "Nhân viên bán không có quyền quyết định",
    })).status).toBe(403);
    expect((await post(stranger.request, "admin/settings", { announcement: "Không được thay đổi" })).status).toBe(403);
    expect((await stranger.request.get("/admin/san-pham")).status()).toBe(200);
  } finally {
    await stranger.close();
  }
  expect((await request.get(evidenceUrl)).status()).toBe(200);
  await login(page.request);
  await page.goto("/admin/doi-tra/" + record.id);
  await expect(page.locator(".return-evidence a")).toHaveCount(1);
  expect((await post(request, "admin/returns/status", {
    id: record.id, status: "UNDER_REVIEW", reason: "Quản trị xác minh lỗi được báo",
  })).status).toBe(200);
});
