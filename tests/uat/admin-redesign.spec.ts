import { test, expect, Page } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { reportFilter } from "../../src/lib/analytics-rules";
import { dashboardSummary } from "../../src/lib/dashboard-summary";
import { randomUUID } from "node:crypto";
const fixture = JSON.parse(
  readFileSync("verification/final-uat/fixtures.json", "utf8"),
);
if (fixture.database !== process.env.DATABASE_URL)
  throw Error("Isolated database required");
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
    role === "SELLER"
      ? origin + "/admin/don-hang"
      : role === "CUSTOMER"
        ? origin + "/"
        : origin + "/admin",
  );
}
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomUUID().replaceAll("-", "").match(/.{4}/g)!.slice(0, 6).join(":")}`,
  });
});
test.afterAll(() => db.$disconnect());
test("Admin redesign: compact overview, daily statuses, relocated KPIs and reports", async ({
  page,
}) => {
  mkdirSync("verification/admin-redesign", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "ADMIN");
  await expect(page.locator(".kpi-card")).toHaveCount(2);
  const f = reportFilter({}),
    expected = await dashboardSummary(f, "ADMIN");
  for (let i = 0; i < 2; i++)
    await expect(page.locator(".kpi-card strong").nth(i)).toHaveText(
      expected.metrics[i].value!.toLocaleString("vi-VN") + (i === 0 ? "đ" : ""),
    );
  const today = reportFilter({ period: "today" }),
    todayCount = await db.order.count({
      where: {
        createdAt: { gte: today.from, lt: today.to },
        items: { some: {} },
      },
    });
  await expect(page.locator(".donut-wrap text").first()).toHaveText(
    todayCount.toLocaleString("vi-VN"),
  );
  await page
    .getByLabel("Ngày trạng thái đơn hàng", { exact: true })
    .fill(f.fromDay);
  const startCount = await db.order.count({
    where: {
      createdAt: { gte: f.from, lt: new Date(f.from.getTime() + 86400000) },
      items: { some: {} },
    },
  });
  await expect(page.locator(".donut-wrap text").first()).toHaveText(
    startCount.toLocaleString("vi-VN"),
  );
  await page.locator('.revenue-plot circle[role="button"]').first().focus();
  await expect(page.locator(".chart-tooltip")).toContainText(
    /\d{2}\/\d{2}\/\d{4}/,
  );
  await expect(page.locator(".chart-tooltip")).toContainText("₫");
  await expect(page.locator(".revenue-date-tick").first()).toHaveText(
    f.fromDay.split("-").reverse().join("/"),
  );
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `verification/admin-redesign/refined-${width}.png`,
      fullPage: true,
    });
  }
  for (const [path, labels] of [
    [
      "don-hang",
      ["Tổng đơn của tháng", "Đơn hoàn tất", "Chờ xử lý", "Đơn hoàn/hủy"],
    ],
    ["khach-hang", ["Khách hàng"]],
    ["san-pham", ["Sản phẩm sắp hết"]],
  ] as const) {
    await page.goto("/admin/" + path);
    for (const label of labels)
      await expect(page.locator(".operational-kpis")).toContainText(label);
  }
  await page.goto("/admin/phan-tich/reports");
  await expect(page.locator(".analytics-filters")).toBeVisible();
  await page.getByLabel("Từ ngày", { exact: true }).fill("2025-01-01");
  await page.getByLabel("Đến ngày", { exact: true }).fill("2025-01-31");
  await page
    .getByLabel("Trạng thái đơn", { exact: true })
    .selectOption("PENDING");
  await page.getByLabel("Loại báo cáo", { exact: true }).selectOption("sales");
  await page
    .locator(".analytics-filters")
    .getByRole("button", { name: "Áp dụng", exact: true })
    .click();
  await expect(page).toHaveURL(/view=sales/);
  await expect(page.getByLabel("Từ ngày", { exact: true })).toHaveValue(
    "2025-01-01",
  );
  await expect(page.getByLabel("Trạng thái đơn", { exact: true })).toHaveValue(
    "PENDING",
  );
  const align = await page.locator(".analytics-filters").evaluate((e) => {
    const date = e.querySelector('[name="from"]')!.getBoundingClientRect(),
      status = e.querySelector('[name="status"]')!.getBoundingClientRect();
    return {
      x: Math.abs(date.x - status.x),
      height: Math.abs(date.height - status.height),
    };
  });
  expect(align.x).toBeLessThan(1);
  expect(align.height).toBeLessThan(1);
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Xuất Doanh số · CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain(".csv");
  await page.goto("/admin");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Mở menu quản trị", exact: true })
    .click();
  await page.locator('.admin-nav a[href="/admin/kho-hang"]').click();
  await expect(page).toHaveURL(origin + "/admin/kho-hang");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".admin-view-store").click();
  await page
    .getByRole("link", { name: "← Về trang quản lý", exact: true })
    .click();
  await expect(page).toHaveURL(origin + "/admin");
  expect(errors).toEqual([]);
  writeFileSync(
    "verification/admin-redesign/refined-verified.json",
    JSON.stringify(
      {
        overviewKpis: 2,
        dailyStatus: true,
        relocatedKpis: true,
        reportFilters: true,
        export: true,
        responsive: true,
        consoleErrors: errors,
      },
      null,
      2,
    ),
  );
});
test("Admin redesign: Seller restrictions and Customer denial remain enforced", async ({
  page,
}) => {
  await login(page, "SELLER");
  await expect(page.locator(".admin-shell")).toBeVisible();
  await expect(
    page.locator('.admin-nav a[href="/admin/nhan-vien"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('.analytics-nav a[href="/admin/phan-tich/profit"]'),
  ).toHaveCount(0);
  expect(
    (await page.request.get("/api/analytics/report?section=finance")).status(),
  ).toBe(403);
  await page.goto("/admin/nhan-vien");
  await expect(
    page.getByRole("heading", { name: "Không có quyền truy cập", exact: true }),
  ).toBeVisible();
  await page.request.post("/api/logout", {
    headers: { Origin: origin },
    data: {},
  });
  await login(page, "CUSTOMER");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", {
      name: "Quyền truy cập bị giới hạn",
      exact: true,
    }),
  ).toBeVisible();
});
