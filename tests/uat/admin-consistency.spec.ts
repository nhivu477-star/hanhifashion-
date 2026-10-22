import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync("verification/final-uat/fixtures.json", "utf8"),
);
if (fixture.database !== process.env.DATABASE_URL)
  throw Error("Isolated database required");
test("Admin consistency: operational pages, forms, tables and responsive shell", async ({
  page,
  context,
}) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": "127.0.0.41" });
  await page.goto("/dang-nhap");
  await page
    .getByLabel("Email", { exact: true })
    .fill(fixture.accounts.SUPER_ADMIN.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(fixture.accounts.SUPER_ADMIN.password);
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
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
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
  await expect(page.locator(".order-month-kpis .kpi-top>span")).toHaveText([
    "Tổng đơn của tháng",
    "Đơn hoàn tất",
    "Chờ xử lý",
    "Đơn hoàn/hủy",
  ]);
  for (let i = 0; i < 4; i++)
    await expect(page.locator(".order-month-kpis strong").nth(i)).toHaveText(
      monthlyCounts[i].toLocaleString("vi-VN"),
    );
  await expect(page.locator(".operational-period")).toHaveCount(0);
  await db.$disconnect();
  await expect(page.locator(".admin-status").first()).toBeVisible();
  const tableFont = await page
    .locator(".admin-page-body td")
    .first()
    .evaluate((e) => getComputedStyle(e).fontFamily);
  expect(tableFont).toContain("Arial");
  const orderLink = page.locator('a[href^="/admin/don-hang/"]').first();
  if (await orderLink.count()) {
    await orderLink.click();
    await expect(page.locator(".admin-heading h1")).toContainText("Đơn hàng");
    await expect(page.locator(".admin-page-body")).toBeVisible();
  }
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
