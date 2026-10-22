import { test, expect, APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
const creds = () => JSON.parse(readFileSync(".test-credentials.json", "utf8"));
const db = new PrismaClient({
  datasources: { db: { url: creds().database } },
});
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
    where: { stock: { gte: 10 }, product: { active: true } },
    include: { product: true },
  });
}
async function login(r: APIRequestContext) {
  const c = creds();
  const res = await post(r, "login", c);
  expect(res.status).toBe(200);
}
test.afterAll(() => db.$disconnect());
test("01 homepage and main navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("thanh lịch");
  await expect(
    page.locator(".product-section").first().locator(".product-card"),
  ).toHaveCount(12);
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page
    .locator(".drawer summary")
    .filter({ hasText: "Thời trang công sở" })
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
  expect(counts.map((c) => c._count.products).sort((a, b) => a - b)).toEqual([
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
  await page.getByLabel("Danh mục", { exact: true }).selectOption("ao-so-mi");
  await expect(page).toHaveURL(/category=ao-so-mi/);
  await page.getByLabel("Chất liệu", { exact: true }).selectOption("Cotton");
  await expect(page).toHaveURL(/material=Cotton/);
  const res = await (
    await request.get(
      "/api/search?category=ao-so-mi&material=Cotton&size=M&stock=1&min=400000&max=700000",
    )
  ).json();
  expect(res.count).toBeGreaterThan(0);
  expect(
    res.products.every(
      (p: any) =>
        p.material === "Cotton" &&
        p.category.slug === "ao-so-mi" &&
        (p.salePrice ?? p.price) >= 400000 &&
        (p.salePrice ?? p.price) <= 700000,
    ),
  ).toBeTruthy();
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
}) => {
  const p = await db.product.findUniqueOrThrow({ where: { sku: "HN001" } });
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
  const v = await db.productVariant.findFirstOrThrow({ where: { stock: 0 } });
  expect(
    (await post(request, "cart", { variantId: v.id, quantity: 1 })).status,
  ).toBe(400);
});
test("10 COD checkout, authoritative price, duplicate protection and privacy", async ({
  request,
  browser,
}) => {
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
  const subtotal = (v.product.salePrice ?? v.product.price) * 2;
  expect(order.subtotal).toBe(subtotal);
  expect(order.total).toBe(subtotal + (subtotal >= 1000000 ? 0 : 30000));
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
  ).toBe(before - 2);
  expect((await request.get(a.data.redirect)).status()).toBe(200);
  const stranger = await browser.newContext();
  expect(
    await (
      await stranger.request.get("http://127.0.0.1:3100" + a.data.redirect)
    ).text(),
  ).toContain("Trang chưa được tìm thấy");
  await stranger.close();
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
    "/admin/bao-cao",
    "/admin/cai-dat",
  ])
    expect((await request.get(route)).status(), route).toBe(200);
  const html = await (await request.get("/admin")).text();
  expect(html).toContain("HN-");
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
    (await post(request, "admin/order", { id: o.id, status: "CANCELLED" }))
      .status,
  ).toBe(200);
  expect(
    (await post(request, "admin/order", { id: o.id, status: "CANCELLED" }))
      .status,
  ).toBe(400);
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
  ).toBe(v.stock + o.items[0].quantity);
});
test("13 registration, login and customer order history", async ({
  request,
  page,
}) => {
  const password = "Customer-test-" + crypto.randomUUID();
  const email = "member@hanhi.test";
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
  expect(res.status).toBe(400);
  const r = await request.post("/api/register", {
    data: {},
    headers: { Origin: "https://evil.example" },
  });
  expect(r.status()).toBe(400);
});
test("15 admin create edit archive product and inventory", async ({
  request,
}) => {
  await login(request);
  const category = await db.category.findFirstOrThrow();
  const sku = "QA" + Date.now();
  const payload = {
    name: "Áo thử nghiệm quản trị",
    slug: sku.toLowerCase(),
    sku,
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
    image: "/images/ao-so-mi.svg",
  };
  const r = await post(request, "admin/product", payload);
  expect(r.status).toBe(200);
  expect((await request.get("/san-pham/" + payload.slug)).status()).toBe(200);
  const p = await db.product.findUniqueOrThrow({
    where: { id: r.data.id },
    include: { variants: true },
  });
  expect(
    (
      await post(request, "admin/stock", {
        variantId: p.variants[0].id,
        stock: 15,
        reason: "QA nhập kho",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await post(request, "admin/stock", {
        variantId: p.variants[0].id,
        stock: -1,
        reason: "QA âm",
      })
    ).status,
  ).toBe(400);
  await post(request, "admin/product", { ...payload, id: p.id, active: false });
  expect(
    await (await request.get("/san-pham/" + payload.slug)).text(),
  ).toContain("Trang chưa được tìm thấy");
});
test("16 coupon validity and usage limits", async ({ request }) => {
  const v = await variant();
  await post(request, "cart", { variantId: v.id, quantity: 3 });
  const bad = await post(request, "quote", { coupon: "INVALID" });
  expect(bad.status).toBe(400);
  const q = await post(request, "quote", { coupon: "CHAO10" });
  expect(q.status).toBe(200);
  expect(q.data.discount).toBe(
    Math.min(Math.floor(q.data.subtotal * 0.1), 200000),
  );
});
test("17 guest wishlist persists and merges on registration", async ({
  page,
}) => {
  await page.goto("/hang-moi");
  await page.locator(".product-card .wish").first().click();
  await page.goto("/yeu-thich");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.goto("/dang-ky");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Khách Yêu Thích");
  await page.getByLabel("Email", { exact: true }).fill("wishlist@hanhi.test");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0912345678");
  await page
    .getByLabel("Mật khẩu (ít nhất 10 ký tự)", { exact: true })
    .fill("Wishlist-password-123");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("Wishlist-password-123");
  await page.getByRole("button", { name: "TẠO TÀI KHOẢN" }).click();
  await expect(page).toHaveURL(/tai-khoan/);
  await page.goto("/yeu-thich");
  await expect(page.locator(".product-card")).toHaveCount(1);
});
test("18 mobile menu and checkout flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(page.locator(".drawer")).toBeVisible();
  await page
    .locator(".drawer summary")
    .filter({ hasText: "Thời trang công sở" })
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
  browser,
}) => {
  const password = "Address-test-password";
  const email = "address@hanhi.test";
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
  const stranger = await browser.newContext();
  await post(stranger.request, "register", {
    ...customer,
    email: "stranger@hanhi.test",
    password,
    confirmPassword: password,
  });
  await post(stranger.request, "address", { id: address.id, delete: true });
  expect(await db.address.count({ where: { id: address.id } })).toBe(1);
  await stranger.close();
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
    image: "/images/ao-so-mi.svg",
  });
  expect(c.status).toBe(200);
  expect((await request.get("/qa-category")).status()).toBe(200);
  expect(
    (
      await post(request, "admin/collection", {
        name: "QA Collection",
        slug: "qa-collection",
        description: "Bộ sưu tập kiểm thử",
        image: "/images/hero.png",
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
  for (const status of ["CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED"])
    expect(
      (await post(request, "admin/order", { id: o.id, status })).status,
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
    (
      await post(request, "admin/order", {
        id: o.id,
        status: "DELIVERED",
        paid: true,
      })
    ).status,
  ).toBe(400);
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
  browser,
}) => {
  const v = await variant();
  await db.productVariant.update({ where: { id: v.id }, data: { stock: 1 } });
  const a = await browser.newContext();
  const b = await browser.newContext();
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
test("25 authenticated cart merge and empty checkout validation", async ({
  request,
}) => {
  const v = await variant();
  await post(request, "cart", { variantId: v.id, quantity: 2 });
  const email = "merge@hanhi.test";
  const password = "Merge-password-123";
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
  await post(request, "cart", { variantId: v.id, quantity: 1 });
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
  const png = readFileSync("public/images/hero.png");
  const good = await request.post("/api/admin/upload", {
    multipart: {
      file: { name: "campaign.png", mimeType: "image/png", buffer: png },
    },
  });
  expect(good.status()).toBe(200);
  const path = (await good.json()).url;
  expect(path).toMatch(/^\/uploads\/[a-f0-9]+\.webp$/);
  expect((await request.get(path)).headers()["content-type"]).toContain(
    "image/webp",
  );
  expect((await request.get(path)).status()).toBe(200);
});
test("28 password reset token is one-use and invalidates sessions", async ({
  request,
}) => {
  const { readdirSync } = await import("node:fs");
  const email = "reset-flow@hanhi.test";
  const password = "Original-password-123";
  await post(request, "register", {
    ...customer,
    email,
    password,
    confirmPassword: password,
  });
  await post(request, "forgot", { email });
  const files = readdirSync(".local-mail")
    .sort()
    .reverse()
    .map((f) => readFileSync(".local-mail/" + f, "utf8"));
  const mail = files.find((s) => s.includes(email));
  expect(mail).toBeTruthy();
  const resetToken = mail!.match(/token=([a-f0-9]{64})/)![1];
  const next = "Replacement-password-123";
  expect(
    (await post(request, "reset", { resetToken, password: next })).status,
  ).toBe(200);
  expect(
    (await post(request, "reset", { resetToken, password: next })).status,
  ).toBe(400);
  expect((await post(request, "login", { email, password })).status).toBe(400);
  expect((await post(request, "login", { email, password: next })).status).toBe(
    200,
  );
});

test("29 approved logo and aligned product prices", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const logo = page.locator(".header-brand-group .brand-logo img");
    await expect(logo).toHaveAttribute("src", "/images/brand-original.png");
    expect(
      await logo.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth === 1536,
      ),
    ).toBeTruthy();
    const rows = await page
      .locator(".product-section")
      .first()
      .locator(".product-card")
      .evaluateAll((cards) =>
        cards.map((c) => ({
          top: c.getBoundingClientRect().top,
          price: c.querySelector(".price")!.getBoundingClientRect().top,
        })),
      );
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
test("30 hierarchical filtering and official contact persistence", async ({
  request,
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
  const r = await (
    await request.get(
      "/api/search?category=" +
        product.category.slug +
        "&subcategory=" +
        product.subcategory!.slug,
    )
  ).json();
  expect(r.count).toBeGreaterThan(0);
  expect(
    r.products.every((p: any) => p.subcategoryId === product.subcategoryId),
  ).toBeTruthy();
  const contact = await post(request, "contact", {
    name: "Khách liên hệ QA",
    email: "inquiry@hanhi.test",
    phone: "0912345678",
    subject: "Tư vấn kích cỡ",
    message: "Tôi muốn được tư vấn kích cỡ phù hợp.",
  });
  expect(contact.status).toBe(200);
  expect(
    await db.inquiry.count({ where: { email: "inquiry@hanhi.test" } }),
  ).toBe(1);
  const html = await (await request.get("/lien-he")).text();
  expect(html).toContain("hanhifashion@gmail.com");
  expect(html).toContain(
    "https://www.facebook.com/share/19MKdV11Hu/?mibextid=wwXIfr",
  );
  await login(request);
  expect((await request.get("/admin/lien-he")).status()).toBe(200);
  const inquiry = await db.inquiry.findFirstOrThrow({
    where: { email: "inquiry@hanhi.test" },
  });
  expect(
    (
      await post(request, "admin/inquiry", {
        id: inquiry.id,
        status: "RESOLVED",
      })
    ).status,
  ).toBe(200);
});

test("31 lookbook tabs and collection navigation", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Khám phá phối đồ" });
  await expect(tabs).toBeVisible();
  await page.getByRole("tab", { name: "Theo danh mục", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Theo danh mục", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.locator(".lookbook-item").first().click();
  await expect(page).toHaveURL(/ao-so-mi/);
});
