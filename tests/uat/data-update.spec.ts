import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
const fixture = JSON.parse(
  readFileSync("verification/final-uat/fixtures.json", "utf8"),
);
if (fixture.database !== process.env.DATABASE_URL)
  throw Error("Isolated fixture required");
const db = new PrismaClient();
const origin = "http://127.0.0.1:3102";
async function login(page: Page, role: string) {
  await page.goto("/dang-nhap");
  await page
    .locator('input[name="email"]')
    .fill(fixture.accounts[role].email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(fixture.accounts[role].password);
  await page.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
  await expect(page).toHaveURL(
    role === "CUSTOMER" ? origin + "/" : origin + "/admin",
  );
}
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomUUID().replaceAll("-", "").match(/.{4}/g)!.slice(0, 6).join(":")}`,
  });
});
test.afterAll(() => db.$disconnect());
test("Data update: dashboard chart, filtered database metrics and storefront return", async ({
  page,
}) => {
  await login(page, "ADMIN");
  await expect(page.locator(".revenue-plot svg")).toBeVisible();
  const chart = page.locator(".revenue-card");
  await chart.getByRole("button", { name: "Theo tháng", exact: true }).click();
  await chart.locator("circle[role=button]").first().focus();
  await expect(chart.locator("output")).toBeVisible();
  await page.locator(".admin-view-store").click();
  await expect(
    page.getByRole("link", { name: "← Về trang quản lý" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "← Về trang quản lý" }).click();
  await expect(page).toHaveURL(origin + "/admin");
  for (const w of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  }
});
test("Data update: stock forms, atomic ledger and tracking ID privacy", async ({
  page,
  browser,
}) => {
  await login(page, "ADMIN");
  const before = await db.productVariant.findUniqueOrThrow({
    where: { id: fixture.product.variantId },
    include: { product: true },
  });
  const key = randomUUID();
  const order = await db.order.create({
    data: {
      code: `UAT-TRACK-${key}`,
      accessToken: randomUUID(),
      idempotencyKey: `uat-data-update-${key}`,
      userId: fixture.accounts.CUSTOMER.id,
      name: "Khách kiểm thử tra cứu",
      phone: "0912345678",
      email: fixture.accounts.CUSTOMER.email,
      province: "Hưng Yên",
      ward: "Phường thử nghiệm",
      street: "123 Kiểm thử",
      details: "",
      notes: "Isolated tracking fixture",
      subtotal: before.product.price,
      discount: 0,
      shipping: 0,
      total: before.product.price,
      items: { create: {
        productId: before.productId,
        variantId: before.id,
        name: before.product.name,
        sku: before.sku,
        size: before.size,
        color: before.color,
        image: fixture.product.image,
        quantity: 1,
        unitPrice: before.product.price,
      } },
    },
  });
  let movementKey: string | undefined;
  try {
  await page.goto("/admin/kho-hang");
  await page.getByText("Nhập / xuất kho theo SKU", { exact: true }).click();
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Lưu biến động kho" }) });
  await form.getByLabel("SKU", { exact: true }).fill(before.sku);
  await form.getByLabel("Số lượng", { exact: true }).fill("2");
  await form
    .getByLabel("Ngày thực hiện")
    .fill(new Date(Date.now() - 60000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19));
  await form.getByLabel("Nhà cung cấp").fill("Nhà cung cấp UAT");
  await form.getByLabel("Lý do", { exact: true }).fill("Nhập bổ sung kiểm thử");
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin/inventory-movement"),
  );
  await form.getByRole("button", { name: "Lưu biến động kho" }).click();
  const moved = await response;
  movementKey = moved.request().postDataJSON().eventKey;
  expect(moved.status()).toBe(200);
  const movement = await db.inventoryMovement.findUniqueOrThrow({
    where: { eventKey: movementKey },
  });
  expect(movement.variantId).toBe(before.id);
  expect(movement.delta).toBe(2);
  await page.waitForLoadState("networkidle");
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: before.id } }))
      .stock,
  ).toBe(before.stock + 2);
  await page.goto("/tra-cuu-don-hang");
  await page.getByLabel("Mã / ID đơn hàng").fill(order.id);
  await page.getByRole("button", { name: "TRA CỨU ĐƠN HÀNG" }).click();
  await expect(page.locator(".summary h2")).toHaveText(order.code);
  await expect(
    page.getByText("Tiến trình đơn hàng", { exact: true }),
  ).toBeVisible();
  const anon = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": `2001:db8:${randomUUID().replaceAll("-", "").match(/.{4}/g)!.slice(0, 6).join(":")}`,
    },
  });
  try {
  const bad = await anon.request.post(origin + "/api/track", {
    headers: { Origin: origin },
    data: { code: order.id },
  });
  expect(bad.ok()).toBe(false);
  const good = await anon.request.post(origin + "/api/track", {
    headers: { Origin: origin },
    data: { code: order.code, phone: order.phone },
  });
  expect(good.ok()).toBe(true);
  expect((await good.json()).items.length).toBeGreaterThan(0);
  } finally {
    await anon.close();
  }
  } finally {
    const movement = movementKey && await db.inventoryMovement.findUnique({
      where: { eventKey: movementKey },
    });
    if (movement) {
      const restore = await page.request.post(
        origin + "/api/admin/inventory-movement",
        {
          headers: { Origin: origin },
          data: {
            sku: before.sku,
            kind: "OUT",
            quantity: movement.delta,
            date: new Date().toISOString(),
            reason: "Kết thúc kiểm thử",
            eventKey: randomUUID(),
          },
        },
      );
      expect(restore.ok()).toBe(true);
    }
  }
});
