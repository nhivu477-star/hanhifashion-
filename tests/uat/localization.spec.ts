import { test, expect, Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
const fixture = JSON.parse(
  readFileSync("verification/final-uat/fixtures.json", "utf8"),
);
if (fixture.database !== process.env.DATABASE_URL)
  throw Error("Isolated database required");
const db = new PrismaClient();
const origin = "http://127.0.0.1:3102";
async function setPreference(
  page: Page,
  language = "en",
  region = "VN",
  currency = "USD",
) {
  const response = await page.request.post("/api/preferences", {
    headers: { Origin: origin },
    data: { language, region, currency },
  });
  expect(response.ok()).toBe(true);
}
async function login(page: Page, role: string) {
  await page.goto("/dang-nhap");
  await page
    .getByLabel("Email", { exact: true })
    .fill(fixture.accounts[role].email);
  await page
    .getByLabel(/^(Mật khẩu|Password)$/)
    .fill(fixture.accounts[role].password);
  await page.getByRole("button", { name: /^(ĐĂNG NHẬP|SIGN IN)$/ }).click();
  await expect(page).toHaveURL(
    role === "SELLER"
      ? origin + "/seller"
      : role === "CUSTOMER"
        ? origin + "/"
        : origin + "/admin",
  );
}
// Separate the extra synthetic customers from the existing suite's request quota.
// The application rate limits remain unchanged; per-email limits still apply.
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": "127.0.0.10" });
});
test.afterEach(async () => {
  await db.shopperPreference.updateMany({
    where: {
      userId: { in: Object.values(fixture.accounts).map((u: any) => u.id) },
    },
    data: { language: "vi", region: "VN", currency: "VND" },
  });
});
test.afterAll(() => db.$disconnect());
test("Localization: guest selector, SSR persistence, product/cart/checkout and VND boundary", async ({
  page,
  context,
  browser,
}) => {
  const hydration: string[] = [];
  page.on("pageerror", (e) => hydration.push(e.message));
  await page.goto("/");
  await expect(page.locator(".preference-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("link", { name: "Cài đặt hiển thị", exact: true }).click();
  await expect(page).toHaveURL(origin + "/cai-dat-hien-thi");
  const form = page.getByRole("form", { name: "Tùy chọn hiển thị" });
  await form.getByLabel("Ngôn ngữ", { exact: true }).selectOption("en");
  await form.getByLabel("Tiền tệ", { exact: true }).selectOption("USD");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/preferences") && r.request().method() === "POST",
  );
  await form.getByRole("button", { name: "Lưu tùy chọn" }).click();
  expect((await response).ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/san-pham/" + fixture.product.slug);
  await expect(
    page.getByRole("button", { name: "ADD TO BAG", exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).toContainText("$23.08");
  await login(page, "CUSTOMER");
  const saved = await db.shopperPreference.findUniqueOrThrow({
    where: { userId: fixture.accounts.CUSTOMER.id },
  });
  expect(saved.language).toBe("en");
  expect(saved.currency).toBe("USD");
  const add = await page.request.post("/api/cart", {
    headers: { Origin: origin },
    data: { variantId: fixture.product.variantId, quantity: 1 },
  });
  expect(add.ok()).toBe(true);
  await page.goto("/gio-hang");
  await expect(
    page.getByRole("heading", { name: "Your shopping bag" }),
  ).toBeVisible();
  await expect(page.locator(".order-summary")).toContainText("$23.08");
  await page.goto("/thanh-toan");
  await expect(
    page.getByRole("button", { name: "PLACE COD ORDER" }),
  ).toBeEnabled();
  await expect(page.locator(".order-summary")).toContainText("630.000đ");
  const quote = await page.request.post("/api/quote", {
    headers: { Origin: origin },
    data: { countryCode: "VN", currency: "USD", exchangeRate: 1, total: 1 },
  });
  expect(quote.ok()).toBe(true);
  expect((await quote.json()).subtotal).toBe(600000);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const fresh = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "127.0.0.10" },
  });
  await fresh.addCookies(
    (await context.cookies()).filter((c) => c.name === "hn_session"),
  );
  const second = await fresh.newPage();
  await second.goto("/tai-khoan");
  await expect(second.locator("html")).toHaveAttribute("lang", "en");
  await expect(second).toHaveTitle(/Accounts/);
  await expect(
    second.getByRole("link", { name: "My orders", exact: true }).first(),
  ).toBeVisible();
  await fresh.close();
  await db.shopperPreference.upsert({
    where: { userId: fixture.accounts.SELLER.id },
    create: {
      userId: fixture.accounts.SELLER.id,
      language: "en",
      region: "VN",
      currency: "USD",
    },
    update: { language: "en", region: "VN", currency: "USD" },
  });
  const savedAccountContext = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "127.0.0.10" },
  });
  const savedAccountPage = await savedAccountContext.newPage();
  await login(savedAccountPage, "SELLER");
  await expect(savedAccountPage.locator("html")).toHaveAttribute("lang", "en");
  expect(
    (await savedAccountContext.cookies()).some(
      (c) => c.name === "hn_preferences",
    ),
  ).toBe(true);
  await savedAccountPage.request.post("/api/logout", {
    headers: { Origin: origin },
    data: {},
  });
  await savedAccountPage.goto("/dang-nhap");
  await expect(savedAccountPage.locator("html")).toHaveAttribute("lang", "en");
  await savedAccountContext.close();
  expect(hydration).toEqual([]);
  await page.screenshot({
    path: "verification/fullstack/checkout-en-usd.png",
    fullPage: true,
  });
});
test("Localization: unsupported shipping blocked in UI/API and postal validation enforced", async ({
  page,
}) => {
  await setPreference(page);
  await login(page, "CUSTOMER");
  expect(
    (
      await page.request.post("/api/cart", {
        headers: { Origin: origin },
        data: { variantId: fixture.product.variantId, quantity: 1 },
      })
    ).ok(),
  ).toBe(true);
  await setPreference(page, "en", "US", "USD");
  await page.goto("/thanh-toan");
  await expect(
    page.getByRole("button", { name: "PLACE COD ORDER" }),
  ).toBeDisabled();
  await expect(page.getByLabel("State", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Postal code", { exact: true })).toBeVisible();
  const before = await db.order.count();
  for (const route of ["quote", "checkout"])
    expect(
      (
        await page.request.post("/api/" + route, {
          headers: { Origin: origin },
          data: { countryCode: "US" },
        })
      ).ok(),
    ).toBe(false);
  expect(await db.order.count()).toBe(before);
  const address = {
    name: "Address QA",
    phone: "+12025550123",
    street: "123 Test Street",
    province: "New York",
    ward: "New York",
    countryCode: "US",
    postalCode: "bad",
  };
  expect(
    (
      await page.request.post("/api/address", {
        headers: { Origin: origin },
        data: address,
      })
    ).ok(),
  ).toBe(false);
  expect(
    (
      await page.request.post("/api/address", {
        headers: { Origin: origin },
        data: { ...address, postalCode: "10001" },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/preferences", {
        headers: { Origin: "https://example.invalid" },
        data: { language: "en", region: "VN", currency: "USD" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/preferences", {
        headers: { Origin: origin },
        data: {
          language: "en",
          region: "VN",
          currency: "USD",
          userId: fixture.accounts.SUPER_ADMIN.id,
        },
      })
    ).status(),
  ).toBe(400);
  await setPreference(page, "en", "VN", "USD");
  await page.goto("/tai-khoan/dia-chi");
  await page.goto("/cai-dat-hien-thi");
  const preferences = page.getByRole("form", { name: "Display preferences" });
  await preferences.getByLabel("Region", { exact: true }).selectOption("SG");
  await preferences.getByRole("button", { name: "Save preferences" }).click();
  await expect(preferences.getByRole("status")).toContainText(
    "Preferences saved",
  );
  await page.goto("/tai-khoan/dia-chi");
  await expect(
    page.locator("form").last().locator('select[name="countryCode"]'),
  ).toHaveValue("SG");
  await setPreference(page, "vi", "VN", "VND");
});
test("Localization: Admin/Seller English, configurable rates and financial RBAC", async ({
  page,
}) => {
  await setPreference(page);
  await login(page, "SUPER_ADMIN");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/kho-hang");
  await expect(
    page.getByText("Stock in / out by SKU", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/cai-dat");
  await expect(
    page.getByText("Display exchange rates", { exact: true }),
  ).toBeVisible();
  const config = (await (await page.request.get("/api/preferences")).json())
    .currencies;
  expect(
    (
      await page.request.post("/api/admin/currencies", {
        headers: { Origin: origin },
        data: {
          ...config,
          rates: [
            ...config.rates,
            { code: "GBP", vndPerUnit: 34000, enabled: true },
          ],
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/admin/currencies", {
        headers: { Origin: origin },
        data: { ...config, rates: [...config.rates, config.rates[0]] },
      })
    ).status(),
  ).toBe(400);
  await page.screenshot({
    path: "verification/fullstack/admin-en.png",
    fullPage: true,
  });
  await page.request.post("/api/logout", {
    headers: { Origin: origin },
    data: {},
  });
  await login(page, "SELLER");
  await expect(page.locator(".admin-nav")).toContainText("SELLER DASHBOARD");
  expect(
    (
      await page.request.post("/api/admin/currencies", {
        headers: { Origin: origin },
        data: config,
      })
    ).status(),
  ).toBe(403);
  await page.screenshot({
    path: "verification/fullstack/seller-en.png",
    fullPage: true,
  });
  const measurements = [];
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    measurements.push({ width, overflow: false });
  }
  writeFileSync(
    "verification/fullstack/localization-responsive.json",
    JSON.stringify(measurements),
  );
});
test("Retired products can be removed from owned carts and wishlists", async ({
  page,
}) => {
  await setPreference(page, "vi", "VN", "VND");
  await login(page, "CUSTOMER");
  const variant = await db.productVariant.findUniqueOrThrow({
    where: { id: fixture.product.variantId },
  });
  await db.product.update({
    where: { id: variant.productId },
    data: { active: true },
  });
  expect(
    (
      await page.request.post("/api/cart", {
        headers: { Origin: origin },
        data: { variantId: variant.id, quantity: 1 },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/wishlist", {
        headers: { Origin: origin },
        data: { productId: variant.productId },
      })
    ).ok(),
  ).toBe(true);
  await db.product.update({
    where: { id: variant.productId },
    data: { active: false },
  });
  expect(
    (
      await page.request.post("/api/cart", {
        headers: { Origin: origin },
        data: { variantId: variant.id, quantity: 0 },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/wishlist", {
        headers: { Origin: origin },
        data: { productId: variant.productId, remove: true },
      })
    ).ok(),
  ).toBe(true);
  const cart = await db.cart.findUniqueOrThrow({
    where: { userId: fixture.accounts.CUSTOMER.id },
    include: { items: true },
  });
  expect(cart.items.some((i) => i.variantId === variant.id)).toBe(false);
  await db.product.update({
    where: { id: variant.productId },
    data: { active: true },
  });
});
