import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { manageAccount } from "../../src/lib/managed-accounts";
import { accountRole } from "../../src/lib/account-types";
const fixture = JSON.parse(
  readFileSync("verification/final-uat/fixtures.json", "utf8"),
);
if (fixture.database !== process.env.DATABASE_URL)
  throw Error("UAT fixture mismatch");
const db = new PrismaClient();
const base = "http://127.0.0.1:3102";
async function login(page: Page, role: string, destination?: string) {
  await page.goto(
    "/dang-nhap" +
      (destination ? "?returnTo=" + encodeURIComponent(destination) : ""),
  );
  await page
    .locator('input[name="email"]')
    .fill(fixture.accounts[role].email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(fixture.accounts[role].password);
  await page.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
}
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": "uat-roles-" + randomUUID(),
  });
});
test.afterAll(async () => {
  await db.$disconnect();
});
test("Anonymous cannot access staff reports or mutate management data", async ({ page }) => {
  for (const section of ["products", "inventory", "finance", "profit", "customers"])
    expect((await page.request.get("/api/analytics/report?section=" + section)).status()).toBe(401);
  for (const action of ["accounts/create", "staff/role", "product", "stock", "shipping/create", "returns/refund", "customer"]) {
    const response = await page.request.post("/api/admin/" + action, {
      headers: { origin: base },
      data: { id: fixture.accounts.CUSTOMER.id, role: "ADMIN" },
    });
    expect(response.status(), action).toBe(403);
  }
});
test("ADMIN account management: create three types, audit and strict role assignment", async ({
  page,
}) => {
  await login(page, "ADMIN", "/admin/tai-khoan");
  await expect(
    page.getByRole("heading", { name: "Quản lý tài khoản", exact: true }),
  ).toBeVisible();
  for (const accountType of ["ADMIN", "SELLER", "CUSTOMER"] as const) {
    const email = `ui-${accountType.toLowerCase()}-${randomUUID()}@uat.local`;
    const form = page.locator("form").filter({
      has: page.getByRole("heading", {
        name: "Tạo tài khoản local",
        exact: true,
      }),
    });
    await form
      .getByLabel("Tên tài khoản", { exact: true })
      .fill("Tài khoản UAT " + accountType);
    await form.getByLabel("Email tài khoản", { exact: true }).fill(email);
    await form
      .getByLabel("Mật khẩu khởi tạo", { exact: true })
      .fill("Uat-Account-" + randomUUID());
    await form.getByLabel("Loại tài khoản được cấp").selectOption(accountType);
    await form
      .getByLabel("Lý do thao tác")
      .fill("Kiểm thử tạo tài khoản được phân quyền đúng");
    const response = page.waitForResponse((r) =>
      r.url().endsWith("/api/admin/accounts/create"),
    );
    await form
      .getByRole("button", { name: "Tạo tài khoản local", exact: true })
      .click();
    expect((await response).status()).toBe(200);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe(accountRole[accountType]);
    expect(user.passwordHash.startsWith("$2")).toBe(true);
    expect(
      await db.auditLog.count({
        where: { targetId: user.id, action: "ACCOUNT_CREATED" },
      }),
    ).toBe(1);
    await expect(
      page.locator(".account-admin-record").filter({ hasText: email }),
    ).toBeVisible();
  }
  const self = await page.request.post("/api/admin/accounts/type", {
    headers: { origin: base },
    data: {
      id: fixture.accounts.ADMIN.id,
      accountType: "CUSTOMER",
      reason: "Test tự hạ quyền",
    },
  });
  expect(self.status()).not.toBe(200);
  const injection = await page.request.post("/api/admin/accounts/create", {
    headers: { origin: base },
    data: {
      name: "Attack",
      email: "attack@uat.local",
      password: randomUUID(),
      accountType: "CUSTOMER",
      role: "ADMIN",
      reason: "Inject role",
    },
  });
  expect(injection.status()).not.toBe(200);
  await page.screenshot({
    path: "verification/final-uat/screenshots/account-management.png",
    fullPage: true,
  });
});
test("SELLER: login destination, product/inventory permission and service/API escalation denial", async ({
  page,
}) => {
  await login(page, "SELLER");
  await expect(page).toHaveURL(base + "/admin/don-hang");
  await page.goto("/admin/san-pham");
  await expect(
    page.getByRole("heading", { name: "Sản phẩm", exact: true }).first(),
  ).toBeVisible();
  expect(
    await page.locator(".admin-nav a[href='/admin/tai-khoan']").count(),
  ).toBe(0);
  const category = await db.category.findUniqueOrThrow({
    where: { slug: "trang-phuc" },
  });
  const token = randomUUID().slice(0, 8);
  const payload = {
    name: "Thiết kế Seller UAT",
    sku: "",
    slug: "seller-uat-" + token,
    description: "Sản phẩm tổng hợp để kiểm thử quyền seller",
    categoryId: category.id,
    material: "Cotton",
    style: "UAT",
    fit: "Regular",
    occasion: "UAT",
    price: 650000,
    salePrice: null,
    active: true,
    featured: false,
    isNew: false,
    image: "/images/lsoul/products/dam-ricci-dress-nguyen-ban-1.webp",
  };
  const created = await page.request.post("/api/admin/product", {
    headers: { origin: base },
    data: payload,
  });
  expect(created.status(), await created.text()).toBe(200);
  const productId = (await created.json()).id;
  payload.sku = (await db.product.findUniqueOrThrow({ where: { id: productId } })).sku;
  const edited = await page.request.post("/api/admin/product", {
    headers: { origin: base },
    data: { ...payload, id: productId, price: 690000 },
  });
  expect(edited.status(), await edited.text()).toBe(200);
  const variant = await db.productVariant.findFirstOrThrow({
    where: { productId },
  });
  const adjusted = await page.request.post("/api/admin/stock", {
    headers: { origin: base },
    data: {
      variantId: variant.id,
      stock: 5,
      reason: "Seller nhập tồn UAT có chứng cứ",
    },
  });
  expect(adjusted.status(), await adjusted.text()).toBe(200);
  expect(
    (await db.product.findUniqueOrThrow({ where: { id: productId } })).price,
  ).toBe(690000);
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
      .stock,
  ).toBe(5);

  for (const url of [
    "/api/admin/accounts/status",
    "/api/admin/staff/role",
    "/api/admin/returns/refund",
    "/api/admin/shipping/collection",
  ]) {
    const r = await page.request.post(url, {
      headers: { origin: base },
      data: {
        id: fixture.accounts.CUSTOMER.id,
        active: false,
        role: "ADMIN",
        reason: "Test privilege escalation",
      },
    });
    expect(r.status(), url).not.toBe(200);
  }
  await expect(
    manageAccount(
      { id: fixture.accounts.CUSTOMER.id, active: false, reason: "Bypass API" },
      "status",
      {
        id: fixture.accounts.SELLER.id,
        role: "ADMIN",
        label: "forged actor role",
      },
    ),
  ).rejects.toThrow();
  await page.goto("/admin/tai-khoan");
  await expect(
    page.getByRole("heading", { name: "Không có quyền truy cập" }),
  ).toBeVisible();
  for (const section of ["finance", "profit", "customers"])
    expect(
      (
        await page.request.get("/api/analytics/report?section=" + section)
      ).status(),
    ).toBe(403);
});
test("CUSTOMER: own data only, no management, disabled session revoked and unlock works", async ({
  page,
  browser,
}) => {
  await login(page, "CUSTOMER");
  await expect(page).toHaveURL(base + "/");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Quyền truy cập bị giới hạn" }),
  ).toBeVisible();
  for (const action of ["accounts/status", "staff/role", "product", "stock", "shipping/create", "customer"]) {
    const response = await page.request.post("/api/admin/" + action, {
      headers: { origin: base },
      data: { id: fixture.accounts.CUSTOMER.id, active: false, role: "ADMIN" },
    });
    expect(response.status(), action).toBe(403);
  }
  const customerOrder = await db.order.findFirst({
    where: { userId: fixture.accounts.CUSTOMER.id },
  });
  // A different customer is created via account management, then denied the order URL.
  const owner = fixture.accounts.ADMIN;
  const privatePassword = randomUUID();
  const otherAccount = await manageAccount(
    {
      name: "Khách riêng UAT",
      email: `private-${randomUUID()}@uat.local`,
      password: privatePassword,
      accountType: "CUSTOMER",
      reason: "Kiểm thử quyền riêng tư",
    },
    "create",
    { id: owner.id, role: "ADMIN", label: "owner" },
  );
  const separate = await browser.newContext({ baseURL: base });
  await separate.setExtraHTTPHeaders({
    "x-forwarded-for": "uat-roles-" + randomUUID(),
  });
  const alternate = await separate.newPage();
  const u = await db.user.findUniqueOrThrow({ where: { id: otherAccount.id } });
  expect(customerOrder).not.toBeNull();
  await alternate.goto("/dang-nhap");
  await alternate.locator('input[name="email"]').fill(u.email);
  await alternate.getByLabel("Mật khẩu", { exact: true }).fill(privatePassword);
  await alternate
    .getByRole("button", { name: "ĐĂNG NHẬP", exact: true })
    .click();
  await expect(alternate).toHaveURL(base + "/");
  await alternate.goto("/tai-khoan/don-hang/" + customerOrder!.id);
  await expect(
    alternate.getByRole("heading", {
      name: "Trang chưa được tìm thấy",
      exact: true,
    }),
  ).toBeVisible();
  await expect(alternate.locator("main")).not.toContainText(
    customerOrder!.code,
  );
  await alternate.request.post("/api/logout", {
    data: {},
    headers: { origin: base },
  });
  await login(
    alternate,
    "ADMIN",
    "/admin/tai-khoan?q=" + encodeURIComponent(fixture.accounts.CUSTOMER.email),
  );
  const row = alternate
    .locator(".account-admin-record")
    .filter({ hasText: fixture.accounts.CUSTOMER.email });
  await row.locator("summary").click();
  const lock = row.locator("form").filter({
    has: alternate.getByRole("button", {
      name: "Khóa tài khoản",
      exact: true,
    }),
  });
  await lock
    .getByLabel("Lý do thao tác")
    .fill("Tạm khóa tài khoản kiểm thử UAT");
  const response = alternate.waitForResponse((r) =>
    r.url().endsWith("/api/admin/accounts/status"),
  );
  await lock
    .getByRole("button", { name: "Khóa tài khoản", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  expect(
    await db.session.count({ where: { userId: fixture.accounts.CUSTOMER.id } }),
  ).toBe(0);
  expect(
    (
      await page.request.post("/api/cart", {
        data: { variantId: fixture.product.variantId, quantity: 1 },
        headers: { origin: base },
      })
    ).status(),
  ).toBe(401);
  const failed = await page.request.post("/api/login", {
    headers: { origin: base },
    data: fixture.accounts.CUSTOMER,
  });
  expect(failed.status()).not.toBe(200);
  await expect(row).toContainText("Đã khóa");
  await row.locator("summary").click();
  const unlock = row.locator("form").filter({
    has: alternate.getByRole("button", {
      name: "Mở khóa tài khoản",
      exact: true,
    }),
  });
  await unlock
    .getByLabel("Lý do thao tác")
    .fill("Mở lại sau khi hoàn tất kiểm thử");
  const unlocked = alternate.waitForResponse((r) =>
    r.url().endsWith("/api/admin/accounts/status"),
  );
  await unlock
    .getByRole("button", { name: "Mở khóa tài khoản", exact: true })
    .click();
  expect((await unlocked).status()).toBe(200);
  await login(page, "CUSTOMER");
  await expect(page).toHaveURL(base + "/");
  expect(
    await db.auditLog.count({
      where: {
        targetId: fixture.accounts.CUSTOMER.id,
        action: "ACCOUNT_STATUS",
      },
    }),
  ).toBe(2);
  expect(u.role).toBe("CUSTOMER");
  await separate.close();
});
