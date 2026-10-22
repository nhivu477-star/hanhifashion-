import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
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
test("Data update: stock forms, atomic ledger, tracking ID privacy and visible wording", async ({
  page,
  browser,
}) => {
  await login(page, "ADMIN");
  await page.goto("/admin/kho-hang");
  await page.getByText("Nhập / xuất kho theo SKU", { exact: true }).click();
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Lưu biến động kho" }) });
  await form.getByLabel("SKU", { exact: true }).fill("FINAL-UAT-M");
  await form.getByLabel("Số lượng", { exact: true }).fill("2");
  await form
    .getByLabel("Ngày thực hiện")
    .fill(new Date(Date.now() - 60000).toISOString().slice(0, 19));
  await form.getByLabel("Nhà cung cấp").fill("Nhà cung cấp UAT");
  await form.getByLabel("Lý do", { exact: true }).fill("Nhập bổ sung kiểm thử");
  const before = await db.productVariant.findUniqueOrThrow({
    where: { sku: "FINAL-UAT-M" },
  });
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin/inventory-movement"),
  );
  await form.getByRole("button", { name: "Lưu biến động kho" }).click();
  expect((await response).status()).toBe(200);
  await page.waitForLoadState("networkidle");
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: before.id } }))
      .stock,
  ).toBe(before.stock + 2);
  const order = await db.order.findFirstOrThrow({
    where: { idempotencyKey: { startsWith: "synthetic-history-2025-v1" } },
  });
  await page.goto("/tra-cuu-don-hang");
  await page.getByLabel("Mã / ID đơn hàng").fill(order.id);
  await page.getByRole("button", { name: "TRA CỨU ĐƠN HÀNG" }).click();
  await expect(page.locator(".summary h2")).toHaveText(order.code);
  await expect(
    page.getByText("Tiến trình đơn hàng", { exact: true }),
  ).toBeVisible();
  const anon = await browser.newContext();
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
  await anon.close();
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/\b(demo|mock|simulated)\b|mô phỏng/i);
  const restore = await page.request.post(
    origin + "/api/admin/inventory-movement",
    {
      headers: { Origin: origin },
      data: {
        sku: before.sku,
        kind: "OUT",
        quantity: 2,
        date: new Date().toISOString(),
        reason: "Kết thúc kiểm thử",
        eventKey: crypto.randomUUID(),
      },
    },
  );
  expect(restore.ok()).toBe(true);
});
