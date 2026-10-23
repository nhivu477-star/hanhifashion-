import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const fixture = JSON.parse(
  readFileSync("verification/final-uat/fixtures.json", "utf8"),
);
if (fixture.database !== process.env.DATABASE_URL)
  throw Error("Isolated database required");
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());
test("Admin consistency: operational pages, forms, tables and responsive shell", async ({
  page,
  context,
}) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomUUID().replaceAll("-", "").match(/.{4}/g)!.slice(0, 6).join(":")}`,
  });
  const variant = await db.productVariant.findUniqueOrThrow({
    where: { id: fixture.product.variantId },
    include: { product: true },
  });
  const key = randomUUID();
  const order = await db.order.create({
    data: {
      code: `UAT-CONSISTENCY-${key}`,
      accessToken: randomUUID(),
      idempotencyKey: `uat-admin-consistency-${key}`,
      userId: fixture.accounts.CUSTOMER.id,
      name: "Khách kiểm thử quản trị",
      phone: "0912345678",
      email: fixture.accounts.CUSTOMER.email,
      province: "Hưng Yên",
      ward: "Phường thử nghiệm",
      street: "123 Kiểm thử",
      details: "",
      notes: "Isolated operational page fixture",
      subtotal: variant.product.price,
      discount: 0,
      shipping: 0,
      total: variant.product.price,
      items: { create: {
        productId: variant.productId,
        variantId: variant.id,
        name: variant.product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        image: fixture.product.image,
        quantity: 1,
        unitPrice: variant.product.price,
      } },
      payments: { create: { amount: variant.product.price } },
    },
  });
  await page.goto("/dang-nhap");
  await page
    .locator('input[name="email"]')
    .fill(fixture.accounts.ADMIN.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(fixture.accounts.ADMIN.password);
  await page.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3102/admin");
  mkdirSync("verification/admin-unified", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const routes = [
    "don-hang",
    "san-pham",
    "khach-hang",
    "kho-hang",
    "van-chuyen",
    "doi-tra",
    "thu-vien-anh",
    "danh-muc",
    "bo-suu-tap",
    "nhan-vien",
    "tai-khoan",
    "phan-quyen",
    "nhat-ky",
    "ma-giam-gia",
    "banner",
    "cai-dat",
    "lien-he",
    "phan-tich/reports",
  ];
  const results = [];
  for (const route of routes) {
    const response = await page.goto("/admin/" + route);
    expect(response?.status()).toBe(200);
    await expect(page.locator(".admin-page-body")).toBeVisible();
    await expect(
      page.locator(".admin-heading h1,.dashboard-title h1").first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    results.push({ route, status: response!.status() });
    if (
      [
        "don-hang",
        "san-pham",
        "nhan-vien",
        "kho-hang",
        "phan-tich/reports",
      ].includes(route)
    )
      await page.screenshot({
        path: `verification/admin-unified/${route.replaceAll("/", "-")}-desktop.png`,
      });
  }
  await page.goto("/admin/don-hang");
  const { reportFilter } = await import("../../src/lib/analytics-rules");
  const month = reportFilter({ period: "month" });
  const createdAt = { gte: month.from, lt: month.to };
  const monthlyCounts = await Promise.all([
    db.order.count({ where: { createdAt } }),
    db.order.count({
      where: { createdAt, status: { in: ["DELIVERED", "COMPLETED"] } },
    }),
    db.order.count({ where: { createdAt, status: "PENDING" } }),
    db.order.count({
      where: { createdAt, status: { in: ["RETURNED", "CANCELLED"] } },
    }),
  ]);
  for (let i = 0; i < 4; i++)
    await expect(page.locator(".order-month-kpis strong").nth(i)).toHaveText(
      monthlyCounts[i].toLocaleString("vi-VN"),
    );
  await expect(page.locator(".admin-status").first()).toBeVisible();
  await page.getByRole("link", { name: order.code, exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:3102/admin/don-hang/${order.id}`);
  await expect(page.locator(".admin-heading h1")).toContainText("Đơn hàng");
  await expect(page.locator(".admin-page-body")).toBeVisible();
  for (const width of [360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "don-hang",
      "san-pham",
      "nhan-vien",
      "kho-hang",
      "cai-dat",
    ]) {
      await page.goto("/admin/" + route);
      await page.waitForTimeout(200);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} ${width}`,
      ).toBe(true);
      if (width === 390)
        await page.screenshot({
          path: `verification/admin-unified/${route}-mobile.png`,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/san-pham/moi");
  await expect(page.locator(".admin-page-body form").first()).toBeVisible();
  await page.screenshot({
    path: "verification/admin-unified/product-editor.png",
  });
  expect(errors).toEqual([]);
  writeFileSync(
    "verification/admin-unified/results.json",
    JSON.stringify(
      {
        routes: results,
        widths: [360, 390, 768, 1024, 1440],
        orderDetail: true,
        productForm: true,
        consoleErrors: errors,
      },
      null,
      2,
    ),
  );
});
