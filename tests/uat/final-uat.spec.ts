import { test, expect, Page, Locator, BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { can, rolePermissions, adminPagePermission } from "../../src/lib/rbac";
import { analyticsPermission } from "../../src/lib/analytics-access";
const fixture = JSON.parse(
  readFileSync("verification/final-uat/fixtures.json", "utf8"),
);
if (
  fixture.database !== process.env.DATABASE_URL ||
  !fixture.database.includes("final-uat-browser-")
)
  throw Error("UAT database mismatch");
const db = new PrismaClient();
const base = "http://127.0.0.1:3102";
mkdirSync("verification/final-uat/screenshots", { recursive: true });
async function localOnly(context: BrowserContext) {
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(u.hostname) ||
      ["data:", "blob:"].includes(u.protocol)
      ? route.continue()
      : route.abort();
  });
}
async function login(page: Page, role: string, returnTo = "/tai-khoan") {
  const c = fixture.accounts[role];
  await page.goto("/dang-nhap?returnTo=" + encodeURIComponent(returnTo));
  await page.getByLabel("Email", { exact: true }).fill(c.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(c.password);
  await page.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
  if (returnTo === "/admin")
    await expect(page).toHaveURL(
      new RegExp(base.replaceAll(".", "\\.") + "/admin(?:/.*)?$"),
    );
  else await expect(page).toHaveURL(base + returnTo);
}
async function submit(
  page: Page,
  form: Locator,
  apiPath: string,
  label?: string,
) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === apiPath && r.request().method() === "POST",
  );
  await (
    label
      ? form.getByRole("button", { name: label, exact: true })
      : form.locator("button[type=submit]")
  ).click();
  const r = await response;
  // Success navigates immediately; reading the old response body can race unload.
  // Committed state is verified against the isolated DB after every operation.
  expect(r.status()).toBe(200);
}
async function returnStep(page: Page, status: string, id: string) {
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Cập nhật hồ sơ", exact: true }),
  });
  await form.locator("select[name=status]").selectOption(status);
  await form
    .locator("textarea[name=reason]")
    .fill("Nghiệm thu local: xác nhận bước xử lý có chứng cứ.");
  await submit(page, form, "/api/admin/returns/status", "Cập nhật hồ sơ");
  await expect
    .poll(
      async () =>
        (await db.returnRequest.findUniqueOrThrow({ where: { id } })).status,
    )
    .toBe(status);
}
test.beforeEach(async ({ context, page }) => {
  await localOnly(context);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(page.url() + ": " + e.message));
  (page as Page & { uatErrors?: string[] }).uatErrors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as Page & { uatErrors?: string[] }).uatErrors).toEqual([]);
});
test.afterAll(async () => {
  await db.$disconnect();
});

test("customer login → cart → COD checkout → shipping → defect return → mock refund", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const stockBefore = (
    await db.productVariant.findUniqueOrThrow({
      where: { id: fixture.product.variantId },
    })
  ).stock;
  await page.goto("/san-pham/" + fixture.product.slug);
  await expect
    .poll(() =>
      db.analyticsEvent.count({
        where: { productId: fixture.product.id, type: "PRODUCT_VIEWED" },
      }),
    )
    .toBeGreaterThan(0);
  await expect(
    page
      .locator(".size-options")
      .getByRole("button", { name: "S", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".size-options")
    .getByRole("button", { name: "M", exact: true })
    .click();
  await page
    .getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true })
    .click();
  await expect(page).toHaveURL(/dang-nhap\?returnTo=/);
  await page
    .getByLabel("Email", { exact: true })
    .fill(fixture.accounts.CUSTOMER.email);
  const password = page.getByLabel("Mật khẩu", { exact: true });
  await password.fill(fixture.accounts.CUSTOMER.password);
  expect((await password.inputValue()).length).toBe(
    fixture.accounts.CUSTOMER.password.length,
  );
  await page
    .getByRole("button", { name: /Hiện mật khẩu|Hiển thị mật khẩu/ })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: /Ẩn mật khẩu/ }).click();
  await page.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
  await expect(page).toHaveURL(base + "/san-pham/" + fixture.product.slug);
  await expect(
    page
      .locator(".size-options")
      .getByRole("button", { name: "M", exact: true }),
  ).toHaveClass(/chosen/);
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
  await page.goto("/gio-hang");
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expect(page.locator(".cart-item")).toContainText("600.000đ");
  await page.getByRole("link", { name: /TIẾN HÀNH THANH TOÁN/ }).click();
  await expect(page).toHaveURL(/thanh-toan/);
  for (const [label, value] of Object.entries({
    "Họ và tên": "Khách UAT",
    "Số điện thoại": "0912345678",
    "Địa chỉ email": fixture.accounts.CUSTOMER.email,
    "Tỉnh / Thành phố": "Hưng Yên",
    "Phường / Xã": "Phường Phố Hiến",
    "Số nhà, tên đường": "123 Đường kiểm thử local",
  }))
    await page.getByLabel(label, { exact: true }).fill(String(value));
  await page.getByRole("button", { name: "ĐẶT HÀNG COD", exact: true }).click();
  await expect(page).toHaveURL(/dat-hang-thanh-cong|don-hang/);
  const order = await db.order.findFirstOrThrow({
    where: { userId: fixture.accounts.CUSTOMER.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  expect(order.status).toBe("PENDING");
  expect(order.paymentStatus).toBe("UNPAID");
  expect(order.total).toBe(630000);
  expect(order.items[0].unitPrice).toBe(600000);
  expect(
    (
      await db.productVariant.findUniqueOrThrow({
        where: { id: fixture.product.variantId },
      })
    ).stock,
  ).toBe(stockBefore - 1);
  await page.goto("/tai-khoan/don-hang/" + order.id);
  await expect(
    page.getByRole("heading", { name: "Đơn hàng " + order.code, exact: true }),
  ).toBeVisible();
  const adminContext = await browser.newContext({ baseURL: base });
  await localOnly(adminContext);
  const admin = await adminContext.newPage();
  await login(admin, "SUPER_ADMIN", "/admin/don-hang/" + order.id);
  for (const next of ["Đã xác nhận", "Đang chuẩn bị"]) {
    await admin.getByLabel("Lý do xử lý đơn").fill("Xác nhận nghiệm thu local");
    const response = admin.waitForResponse(
      (r) =>
        r.url().endsWith("/api/admin/order") && r.request().method() === "POST",
    );
    await admin.getByRole("button", { name: next, exact: true }).click();
    expect((await response).status()).toBe(200);
  }
  await admin.locator(".packing-checklist input[type=checkbox]").check();
  await admin
    .getByLabel("Ghi nhận kiểm tra đóng gói")
    .fill("Đã đối chiếu đúng SKU, màu, size và đủ lượng");
  const packedResponse = admin.waitForResponse((r) =>
    r.url().endsWith("/api/admin/order/pack"),
  );
  await admin
    .getByRole("button", { name: "Xác nhận đã đóng gói", exact: true })
    .click();
  expect((await packedResponse).status()).toBe(200);
  await expect
    .poll(
      async () =>
        !!(await db.order.findUniqueOrThrow({ where: { id: order.id } }))
          .packedAt,
    )
    .toBe(true);
  await admin.goto("/admin/van-chuyen");
  const create = admin.locator("form").filter({
    has: admin.getByRole("heading", { name: "Tạo hồ sơ giao nhận" }),
  });
  await create.getByLabel("Đơn đủ điều kiện").selectOption(order.id);
  await create.getByLabel("Phí giao (VND)").fill("30000");
  await create
    .getByLabel("Mô tả kiện hàng")
    .fill("Một sản phẩm kiểm thử local");
  await create.getByLabel("Khối lượng (gram)").fill("500");
  await submit(admin, create, "/api/admin/shipping/create");
  await expect(admin).toHaveURL(/admin\/van-chuyen\//);
  const shipment = await db.shipment.findUniqueOrThrow({
    where: { orderId: order.id },
  });
  expect(shipment.reference).toMatch(/^HN-SHIP-/);
  for (const status of [
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ]) {
    const form = admin.locator("form").filter({
      has: admin.getByRole("heading", {
        name: "Cập nhật giao nhận thủ công",
      }),
    });
    await form.locator("select[name=status]").selectOption(status);
    await form
      .getByLabel("Ghi chú / lý do")
      .fill("Sự kiện giao nhận mô phỏng UAT");
    await submit(admin, form, "/api/admin/shipping/status");
    await expect
      .poll(
        async () =>
          (await db.shipment.findUniqueOrThrow({ where: { id: shipment.id } }))
            .status,
      )
      .toBe(status);
  }
  await page.reload();
  await expect(
    page.getByText("Đã giao", { exact: true }).first(),
  ).toBeVisible();
  for (const [operation, heading] of [
    ["collection", "Hãng đã thu từ khách"],
    ["remittance", "Hãng đã chuyển tiền về"],
  ]) {
    const form = admin.locator("form").filter({
      has: admin.getByRole("heading", { name: heading, exact: true }),
    });
    await form.getByLabel("Số tiền (VND)").fill(String(order.total));
    await form.getByLabel("Mã chứng từ / tham chiếu").fill("UAT-" + operation);
    await form
      .getByLabel("Bằng chứng / ghi chú nguồn tiền")
      .fill("Chứng từ mô phỏng, không chuyển tiền thật");
    await form.getByLabel("Ngày giờ phát sinh").fill(
      await admin.evaluate(() => {
        const d = new Date();
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 19)
          .replace(/:00$/, "");
      }),
    );
    await submit(admin, form, "/api/admin/shipping/" + operation);
  }
  const reconcile = admin.locator("form").filter({
    has: admin.getByRole("heading", { name: "Đối soát & điều tra" }),
  });
  await reconcile
    .getByLabel("Kết luận / chứng cứ đối soát")
    .fill("Đã đối chiếu đầy đủ dữ liệu mô phỏng");
  await submit(admin, reconcile, "/api/admin/shipping/reconcile");
  await expect
    .poll(
      async () =>
        (await db.shipment.findUniqueOrThrow({ where: { id: shipment.id } }))
          .reconciliationStatus,
    )
    .toBe("RECONCILED");
  await page.reload();
  await page
    .getByRole("spinbutton", { name: "Số lượng trả Thiết kế UAT local" })
    .fill("1");
  await page
    .getByLabel("Mô tả lỗi")
    .fill("Đường may bị lỗi, kiểm thử hồ sơ hàng lỗi local.");
  await page
    .locator("input[name=evidence]")
    .setInputFiles(
      "public" + "/images/lsoul/products/dam-ricci-dress-nguyen-ban-1.webp",
    );
  const claimResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/returns") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Gửi yêu cầu đổi trả" }).click();
  expect((await claimResponse).status()).toBe(200);
  const claim = await db.returnRequest.findFirstOrThrow({
    where: { orderId: order.id },
    include: { items: true, evidence: true },
  });
  expect(claim.deadline.getTime() - claim.deliveredAt.getTime()).toBe(
    72 * 3600000,
  );
  expect(claim.evidence).toHaveLength(1);
  await admin.goto("/admin/doi-tra/" + claim.id);
  for (const status of ["UNDER_REVIEW", "APPROVED", "RECEIVED"])
    await returnStep(admin, status, claim.id);
  const inspect = admin.locator("form").filter({
    has: admin.getByRole("button", { name: "Lưu kiểm hàng", exact: true }),
  });
  await inspect.getByLabel("Kết quả kiểm hàng").selectOption("DAMAGED");
  await inspect
    .getByLabel("Bằng chứng kiểm tra nội bộ")
    .fill("Đã kiểm tra sản phẩm lỗi, không nhập tồn bán");
  await inspect
    .locator("textarea[name=reason]")
    .fill("Xác nhận lỗi đường may theo chứng cứ");
  await submit(admin, inspect, "/api/admin/returns/inspect", "Lưu kiểm hàng");
  await expect
    .poll(
      async () =>
        (await db.returnRequest.findUniqueOrThrow({ where: { id: claim.id } }))
          .status,
    )
    .toBe("INSPECTED");
  const refund = admin.locator("form").filter({
    has: admin.getByRole("button", {
      name: "Tính và tạo khoản hoàn",
      exact: true,
    }),
  });
  await refund
    .locator("textarea[name=reason]")
    .fill("Hoàn tiền hàng do lỗi đã xác nhận");
  await submit(
    admin,
    refund,
    "/api/admin/returns/refund",
    "Tính và tạo khoản hoàn",
  );
  for (const status of ["APPROVED", "SIMULATED_COMPLETED"]) {
    const form = admin.locator("form").filter({
      has: admin.getByRole("button", {
        name: "Ghi nhận hoàn tiền",
        exact: true,
      }),
    });
    await form.locator("select[name=status]").selectOption(status);
    await form
      .locator("textarea[name=reason]")
      .fill("Xác nhận hoàn mô phỏng UAT, không chuyển tiền thật");
    await submit(
      admin,
      form,
      "/api/admin/returns/refund-status",
      "Ghi nhận hoàn tiền",
    );
  }
  await expect
    .poll(
      async () =>
        (await db.returnRequest.findUniqueOrThrow({ where: { id: claim.id } }))
          .status,
    )
    .toBe("COMPLETED");
  const paid = await db.mockRefund.findUniqueOrThrow({
    where: { requestId: claim.id },
  });
  expect(paid.amount).toBe(600000);
  expect(paid.status).toBe("SIMULATED_COMPLETED");
  expect(
    (
      await db.productVariant.findUniqueOrThrow({
        where: { id: fixture.product.variantId },
      })
    ).stock,
  ).toBe(stockBefore - 1);
  await page.reload();
  await expect(page.locator(".returns-section")).toContainText("Đã hoàn tất");
  await admin.screenshot({
    path: "verification/final-uat/screenshots/refund-completed.png",
    fullPage: true,
  });
  await admin.goto("/admin/phan-tich/sales");
  await expect(admin.locator(".analytics-interactive svg")).toBeVisible();
  await admin.goto("/admin/phan-tich/reports");
  const download = admin.waitForEvent("download");
  await admin
    .getByRole("link", { name: "Xuất Doanh số · CSV", exact: true })
    .click();
  const csv = await download;
  expect(csv.suggestedFilename()).toContain(".csv");
  await csv.saveAs("verification/final-uat/sales.csv");
  writeFileSync(
    "verification/final-uat/journey.json",
    JSON.stringify({
      orderId: order.id,
      code: order.code,
      shipmentId: shipment.id,
      claimId: claim.id,
      amount: order.total,
      mockRefund: paid.amount,
      damagedStockUnchanged: true,
      policyHours: 72,
    }),
  );
  await adminContext.close();
  await page.goto("/tai-khoan");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/dang-nhap/);
});

for (const role of Object.keys(rolePermissions).filter(
  (r) => r !== "CUSTOMER",
)) {
  test(`staff role ${role}: allowed admin menu and protected financial API`, async ({
    page,
  }) => {
    await login(page, role, "/admin");
    await expect(page.locator(".admin-shell")).toBeVisible();
    const links = await page.locator(".admin-nav nav a").evaluateAll((links) =>
      links.map((a) => ({
        text: a.textContent,
        path: new URL((a as HTMLAnchorElement).href).pathname,
      })),
    );
    for (const link of links) {
      if (
        link.path.startsWith("/admin/") &&
        !link.path.includes("bao-cao") &&
        !link.path.includes("phan-quyen")
      ) {
        const key = link.path.split("/")[2];
        const permission = adminPagePermission[key];
        if (permission)
          expect(can(role, permission), `${role}: ${link.text}`).toBe(true);
      }
    }
    for (const section of [
      "sales",
      "products",
      "customers",
      "inventory",
      "profit",
      "marketing",
      "finance",
    ] as const) {
      const response = await page.request.get(
        "/api/analytics/report?section=" + section,
      );
      expect(response.status(), `${role} ${section}`).toBe(
        can(role, analyticsPermission[section]) ? 200 : 403,
      );
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
  });
}

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`responsive ${width}px: populated storefront, forms, account and analytics`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dang-nhap");
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `verification/final-uat/screenshots/${width}-login.png`,
      fullPage: true,
    });
    await login(page, "CUSTOMER");
    const r = await page.request.post("/api/cart", {
      data: { variantId: fixture.product.variantId, quantity: 1 },
      headers: { origin: base },
    });
    expect(r.status()).toBe(200);
    const measures = [];
    for (const [name, url, content] of [
      ["home", "/", "main"],
      ["catalog", "/trang-phuc?subcategory=ao", ".catalog-page"],
      ["product", "/san-pham/" + fixture.product.slug, ".product-detail"],
      ["cart", "/gio-hang", ".cart-item"],
      ["checkout", "/thanh-toan", "form#checkout-form"],
      ["account", "/tai-khoan", ".account-layout"],
      ["policy", "/chinh-sach-doi-tra", "main"],
    ]) {
      await page.goto(url);
      await expect(page.locator(content).first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (name === "home" || name === "catalog") {
        for (const img of await page.locator("main img").all()) {
          if (await img.isVisible()) {
            await img.scrollIntoViewIfNeeded();
            await expect
              .poll(() =>
                img.evaluate((el: HTMLImageElement) => el.naturalWidth),
              )
              .toBeGreaterThan(0);
          }
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      const m = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      measures.push({ name, ...m });
      expect(m.document, name + " horizontal overflow").toBeLessThanOrEqual(
        width + 1,
      );
      await page.screenshot({
        path: `verification/final-uat/screenshots/${width}-${name}.png`,
        fullPage: true,
      });
      if (name === "home") {
        await page
          .getByRole("button", { name: "Mở menu", exact: true })
          .click();
        await expect(page.locator(".drawer")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.locator(".drawer")).not.toBeVisible();
        await page
          .getByRole("button", {
            name: width < 768 ? "Tìm kiếm" : "Mở tìm kiếm",
            exact: true,
          })
          .click();
        await expect(page.locator(".search-dialog")).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
    await login(page, "SUPER_ADMIN", "/admin/phan-tich/products");
    for (const section of ["products", "sales", "finance", "profit"]) {
      await page.goto("/admin/phan-tich/" + section);
      await expect(page.locator(".analytics-admin")).toBeVisible();
      const m = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      measures.push({ name: "admin-" + section, ...m });
      expect(m.document, section + " admin overflow").toBeLessThanOrEqual(
        width + 1,
      );
      await page.screenshot({
        path: `verification/final-uat/screenshots/${width}-admin-${section}.png`,
        fullPage: true,
      });
    }
    await page.goto("/admin/tai-khoan");
    await expect(
      page.getByRole("heading", { name: "Quản lý tài khoản", exact: true }),
    ).toBeVisible();
    const accountWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(accountWidth).toBeLessThanOrEqual(width + 1);
    measures.push({
      name: "admin-accounts",
      viewport: width,
      document: accountWidth,
    });
    await page.screenshot({
      path: `verification/final-uat/screenshots/${width}-admin-accounts.png`,
      fullPage: true,
    });
    writeFileSync(
      `verification/final-uat/responsive-${width}.json`,
      JSON.stringify(measures, null, 2),
    );
  });
}
