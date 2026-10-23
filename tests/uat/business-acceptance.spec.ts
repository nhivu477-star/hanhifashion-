import { test as base, expect, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
const fixture = JSON.parse(
  readFileSync("verification/final-uat/fixtures.json", "utf8"),
);
if (
  fixture.database !== process.env.DATABASE_URL ||
  !fixture.database.includes("final-uat-browser-")
)
  throw Error("Isolated browser fixture required");
const db = new PrismaClient(),
  origin = "http://127.0.0.1:3102";
const settingsKeys = [
  "business.partialCancellationPolicy",
  "announcement", "brandStory", "newsletter", "contactEmail", "contactPhone",
  "facebookUrl", "instagramUrl", "footerAddress", "salesPolicy",
  "returnsInstructions", "sizeGuide",
];
const test = base.extend<{
  isolation: void;
  product: { id: string; variantId: string; slug: string; name: string };
}>({
  isolation: [async ({}, use) => {
    const settings = await db.storeSetting.findMany({
      where: { key: { in: settingsKeys } },
    });
    const cart = await db.cart.findUnique({
      where: { userId: fixture.accounts.CUSTOMER.id },
      include: { items: true },
    });
    if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    try {
      await use();
    } finally {
      await db.$transaction(async (tx) => {
        await tx.storeSetting.deleteMany({ where: { key: { in: settingsKeys } } });
        if (settings.length) await tx.storeSetting.createMany({ data: settings });
        const current = await tx.cart.findUnique({
          where: { userId: fixture.accounts.CUSTOMER.id },
        });
        if (current) await tx.cartItem.deleteMany({ where: { cartId: current.id } });
        if (cart?.items.length) await tx.cartItem.createMany({ data: cart.items });
      });
    }
  }, { auto: true }],
  product: async ({ isolation }, use) => {
    void isolation;
    const source = await db.product.findUniqueOrThrow({
      where: { id: fixture.product.id },
    });
    const key = randomUUID();
    const product = await db.product.create({
      data: {
        name: `Thiết kế UAT ${key.slice(0, 8)}`,
        slug: `uat-business-${key}`,
        sku: `UAT-BUSINESS-${key}`,
        description: source.description,
        material: source.material,
        style: source.style,
        fit: source.fit,
        occasion: source.occasion,
        searchText: "uat business",
        price: source.price,
        categoryId: source.categoryId,
        images: { create: { url: fixture.product.image, alt: "Ảnh kiểm thử UAT" } },
        variants: { create: {
          sku: `UAT-BUSINESS-M-${key}`,
          size: "M",
          color: "Trắng UAT",
          colorHex: "#ffffff",
          stock: 12,
        } },
      },
      include: { variants: true },
    });
    // Orders and ledger entries belong to this test's dedicated product.
    await use({ ...product, variantId: product.variants[0].id });
  },
});
const businessErrors = new WeakMap<Page, string[]>();
async function login(page: Page, role: string) {
  const r = await page.request.post("/api/login", {
    headers: { origin },
    data: fixture.accounts[role],
  });
  expect(r.status()).toBe(200);
}
test.beforeEach(async ({ context, page }) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomUUID().replaceAll("-", "").match(/.{4}/g)!.slice(0, 6).join(":")}`,
  });
  await context.route("**/*", (route) =>
    ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  businessErrors.set(page, errors);
});
test.afterEach(async ({ page }) =>
  expect(businessErrors.get(page)).toEqual([]),
);
test.afterAll(() => db.$disconnect());

test("Business acceptance UI: customer partial cancellation updates payment stock and history", async ({
  page,
  product,
}) => {
  // Test-only policy fixture. Main database intentionally has no approval.
  await db.storeSetting.upsert({
    where: { key: "business.partialCancellationPolicy" },
    create: {
      key: "business.partialCancellationPolicy",
      value: "NET_SNAPSHOT_V1_APPROVED",
    },
    update: { value: "NET_SNAPSHOT_V1_APPROVED" },
  });
  await login(page, "CUSTOMER");
  const before = await db.productVariant.findUniqueOrThrow({
    where: { id: product.variantId },
  });
  expect(
    (
      await page.request.post("/api/cart", {
        headers: { origin },
        data: { variantId: before.id, quantity: 3 },
      })
    ).status(),
  ).toBe(200);
  const key = randomUUID();
  const response = await page.request.post("/api/checkout", {
    headers: { origin },
    data: {
      idempotencyKey: key,
      name: "Khách kiểm thử",
      email: "ui@acceptance.local",
      phone: "0912345678",
      province: "Hưng Yên",
      ward: "Phường thử nghiệm",
      street: "123 Kiểm thử",
      details: "",
      notes: "Local",
    },
  });
  expect(response.status()).toBe(200);
  const order = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
    include: { items: true },
  });
  await page.goto("/tai-khoan/don-hang/" + order.id);
  await page.getByText("Hủy một phần đơn hàng", { exact: true }).click();
  await page
    .getByLabel("Lý do hủy một phần", { exact: true })
    .fill("Hủy một sản phẩm theo yêu cầu của khách");
  const result = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/order/cancel-items") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Xác nhận hủy sản phẩm", exact: true })
    .click();
  expect((await result).status()).toBe(200);
  await expect
    .poll(
      async () =>
        (
          await db.orderItem.findUniqueOrThrow({
            where: { id: order.items[0].id },
          })
        ).quantity,
    )
    .toBe(2);
  await expect(page.getByText(/Hủy 1 sản phẩm/).first()).toBeVisible();
  const saved = await db.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { payments: true },
  });
  expect(saved.total).toBe(order.total - order.items[0].unitPrice);
  expect(saved.payments[0].amount).toBe(saved.total);
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: before.id } }))
      .stock,
  ).toBe(before.stock - 2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  mkdirSync("verification/business-acceptance/screenshots", {
    recursive: true,
  });
  await page.screenshot({
    path: "verification/business-acceptance/screenshots/partial-customer.png",
    fullPage: true,
  });
});

test("Business acceptance UI: admin customer profile and partial cancellation", async ({
  page,
  product,
}) => {
  await db.storeSetting.upsert({
    where: { key: "business.partialCancellationPolicy" },
    create: { key: "business.partialCancellationPolicy", value: "NET_SNAPSHOT_V1_APPROVED" },
    update: { value: "NET_SNAPSHOT_V1_APPROVED" },
  });
  await login(page, "CUSTOMER");
  expect((await page.request.post("/api/cart", {
    headers: { origin },
    data: { variantId: product.variantId, quantity: 2 },
  })).status()).toBe(200);
  const key = randomUUID();
  expect((await page.request.post("/api/checkout", {
    headers: { origin },
    data: {
      idempotencyKey: key,
      name: "Khách kiểm thử quản trị",
      phone: "0912345678",
      email: fixture.accounts.CUSTOMER.email,
      province: "Hưng Yên",
      ward: "Phường thử nghiệm",
      street: "123 Kiểm thử",
      details: "",
      notes: "Local admin cancellation fixture",
    },
  })).status()).toBe(200);
  const order = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
    include: { items: true },
  });
  expect((await page.request.post("/api/logout", {
    headers: { origin }, data: {},
  })).status()).toBe(200);
  await login(page, "ADMIN");
  await page.goto("/admin/khach-hang/" + fixture.accounts.CUSTOMER.id);
  await expect(
    page.getByRole("heading", { name: "Lịch sử mua hàng", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Yêu cầu hỗ trợ gần đây", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: order.code, exact: true }).click();
  await expect(page).toHaveURL(origin + "/admin/don-hang/" + order.id);
  await page.getByText("Hủy một phần đơn hàng", { exact: true }).click();
  await page
    .getByLabel("Lý do hủy một phần", { exact: true })
    .fill("Quản trị viên xác nhận yêu cầu hủy bớt");
  const result = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin/order-items-cancel"),
  );
  await page
    .getByRole("button", { name: "Xác nhận hủy sản phẩm", exact: true })
    .click();
  expect((await result).status()).toBe(200);
  await expect
    .poll(
      async () =>
        (
          await db.orderItem.findUniqueOrThrow({
            where: { id: order.items[0].id },
          })
        ).quantity,
    )
    .toBe(1);
});

test("Business acceptance UI: scheduled voucher policy settings and real Excel download", async ({
  page,
}) => {
  await login(page, "ADMIN");
  await page.goto("/admin/ma-giam-gia");
  const form = page.locator("form").last(),
    code = "UI_" + randomUUID().slice(0, 8).toUpperCase();
  await form.getByLabel("Mã giảm giá", { exact: true }).fill(code);
  await form.getByLabel("Giá trị", { exact: true }).fill("10");
  await form
    .getByLabel("Ngày bắt đầu (giờ Việt Nam)", { exact: true })
    .fill("2026-01-01T00:00");
  await form
    .getByLabel("Ngày hết hạn (giờ Việt Nam)", { exact: true })
    .fill("2027-01-01T23:59");
  await form.getByLabel("Giới hạn lượt dùng", { exact: true }).fill("100");
  let result = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin/coupon"),
  );
  await form.getByRole("button", { name: "LƯU THAY ĐỔI", exact: true }).click();
  expect((await result).status()).toBe(200);
  const coupon = await db.coupon.findUniqueOrThrow({ where: { code } });
  expect(coupon.startsAt?.toISOString()).toBe("2025-12-31T17:00:00.000Z");
  await page.goto("/admin/cai-dat");
  const note = "Hướng dẫn kiểm thử UI " + randomUUID();
  await page
    .getByLabel("Thông tin bán hàng bổ sung", { exact: true })
    .fill(note);
  await page
    .getByLabel(
      "Hướng dẫn tiếp nhận đổi trả (chính sách lỗi 72 giờ vẫn áp dụng)",
      { exact: true },
    )
    .fill(note);
  const settingsForm = page.locator("form").filter({
    has: page.getByLabel("Thông tin bán hàng bổ sung", { exact: true }),
  });
  for (const [name, value] of Object.entries({
    announcement: "Thông báo kiểm thử UAT",
    brandStory: "Câu chuyện kiểm thử UAT",
    newsletter: "Đăng ký nhận tin kiểm thử",
    contactEmail: "contact@uat.local",
    contactPhone: "0912345678",
    facebookUrl: "https://example.invalid/uat-facebook",
    instagramUrl: "https://example.invalid/uat-instagram",
    footerAddress: "123 Địa chỉ kiểm thử",
    sizeGuide: JSON.stringify([{
      size: "M", bust: 88, waist: 68, hip: 92, shoulder: 38,
      length: 60, sleeve: 20, trouser: 95, skirt: 60,
    }]),
  })) {
    const field = settingsForm.locator(`[name="${name}"]`);
    if (!(await field.inputValue())) await field.fill(value);
  }
  result = page.waitForResponse((r) => r.url().endsWith("/api/admin/settings"));
  await settingsForm
    .getByRole("button", { name: "LƯU THAY ĐỔI", exact: true })
    .click();
  expect((await result).status()).toBe(200);
  await page.goto("/chinh-sach-doi-tra");
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await expect(
    page.getByText(/đủ 72 giờ từ thời điểm nhận hàng/),
  ).toBeVisible();
  await page.goto("/admin/phan-tich/reports?view=sales");
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Xuất Doanh số · Excel", exact: true })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("hanhi-sales.xlsx");
  const path = await file.path();
  expect(path).toBeTruthy();
  expect(readFileSync(path!).subarray(0, 2).toString()).toBe("PK");
  execFileSync("python3", [
    "-c",
    "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert 'xl/worksheets/sheet1.xml' in z.namelist()",
    path!,
  ]);
});

test("Business acceptance UI: stocktake approval verified review and seller response", async ({
  page,
  browser,
  product,
}) => {
  await login(page, "ADMIN");
  const stock = await db.productVariant.findUniqueOrThrow({
    where: { id: product.variantId },
  });
  await page.goto("/admin/kho-hang");
  await page.getByText("Tạo phiếu kiểm kê", { exact: true }).click();
  const create = page.getByRole("form", {
    name: "Tạo phiếu kiểm kê",
    exact: true,
  });
  await create.getByLabel("SKU kiểm kê", { exact: true }).fill(stock.sku);
  await create
    .getByLabel("Tồn bán được thực tế", { exact: true })
    .fill(String(stock.stock + 1));
  await create.getByLabel("Hàng hỏng cách ly", { exact: true }).fill("2");
  await create
    .getByLabel("Lý do kiểm kê", { exact: true })
    .fill("Đếm thực tế và tách hàng hỏng");
  let response = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin/stocktakes/create"),
  );
  await create
    .getByRole("button", { name: "Lưu phiếu nháp", exact: true })
    .click();
  const createdResponse = await response;
  expect(createdResponse.status()).toBe(200);
  const eventKey = createdResponse.request().postDataJSON().eventKey;
  const record = (await db.stocktake.findUniqueOrThrow({ where: { eventKey } }))
    .id;
  for (const status of ["SUBMITTED", "APPROVED"]) {
    await page.goto("/admin/kho-hang");
    const detail = page
      .locator(".stocktake-panel > details")
      .filter({ has: page.getByRole("cell", { name: stock.sku, exact: true, includeHidden: true }) });
    await detail.locator("summary").click();
    const form = detail.locator("form");
    await form
      .getByRole("combobox", { name: /Xử lý kiểm kê/ })
      .selectOption(status);
    await form
      .getByLabel("Lý do xử lý kiểm kê", { exact: true })
      .fill("Đối chiếu và xác nhận kiểm kê");
    response = page.waitForResponse((r) =>
      r.url().endsWith("/api/admin/stocktakes/status"),
    );
    await form
      .getByRole("button", { name: "Cập nhật phiếu kiểm kê", exact: true })
      .click();
    expect((await response).status()).toBe(200);
  }
  expect(
    (await db.stocktake.findUniqueOrThrow({ where: { id: record } })).status,
  ).toBe("APPROVED");
  expect(
    (await db.productVariant.findUniqueOrThrow({ where: { id: stock.id } }))
      .stock,
  ).toBe(stock.stock + 1);
  const buyerContext = await browser.newContext({ baseURL: origin });
  try {
  await buyerContext.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomUUID().replaceAll("-", "").match(/.{4}/g)!.slice(0, 6).join(":")}`,
  });
  const buyer = await buyerContext.newPage();
  await login(buyer, "CUSTOMER");
  expect(
    (
      await buyer.request.post("/api/cart", {
        headers: { origin },
        data: { variantId: stock.id, quantity: 1 },
      })
    ).status(),
  ).toBe(200);
  const key = randomUUID();
  expect(
    (
      await buyer.request.post("/api/checkout", {
        headers: { origin },
        data: {
          idempotencyKey: key,
          name: "Khách UI",
          phone: "0912345678",
          email: "feedback@uat.local",
          province: "Hưng Yên",
          ward: "Phường thử nghiệm",
          street: "123 Kiểm thử",
          details: "",
          notes: "Local",
        },
      })
    ).status(),
  ).toBe(200);
  const order = await db.order.findUniqueOrThrow({
    where: { idempotencyKey: key },
    include: { items: true },
  });
  for (const status of ["CONFIRMED", "PROCESSING"]) {
    expect(
      (
        await page.request.post("/api/admin/order", {
          headers: { origin },
          data: { id: order.id, status },
        })
      ).status(),
    ).toBe(200);
  }
  expect(
    (
      await page.request.post("/api/admin/order/pack", {
        headers: { origin },
        data: {
          id: order.id,
          eventKey: randomUUID(),
          kind: "PACK",
          reason: "Kiểm tra hàng đủ trước bàn giao",
          items: order.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            checked: true,
          })),
        },
      })
    ).status(),
  ).toBe(200);
  for (const status of ["SHIPPING", "DELIVERED"]) {
    expect(
      (
        await page.request.post("/api/admin/order", {
          headers: { origin },
          data: {
            id: order.id,
            status,
            reason: "Giao nhận kiểm thử UI",
            reference: "LOCAL-FEEDBACK",
          },
        })
      ).status(),
    ).toBe(200);
  }
  await buyer.goto("/tai-khoan/don-hang/" + order.id);
  await buyer.getByText(`Đánh giá ${product.name}`, { exact: true }).click();
  const text = "Khách đã nhận hàng và đánh giá qua giao diện";
  await buyer
    .getByLabel(`Nhận xét về ${product.name}`, { exact: true })
    .fill(text);
  response = buyer.waitForResponse((r) => r.url().endsWith("/api/reviews"));
  await buyer
    .getByRole("button", { name: "Gửi đánh giá", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  expect((await page.request.post("/api/logout", {
    headers: { origin }, data: {},
  })).status()).toBe(200);
  await login(page, "SELLER");
  await page.goto("/admin/lien-he");
  const review = page
    .locator("details")
    .filter({
      has: page.locator("summary", { hasText: `${product.name} · 5/5` }),
    })
    .first();
  await review.locator("summary").click();
  await review
    .getByLabel("Phản hồi công khai từ cửa hàng", { exact: true })
    .fill("Cửa hàng cảm ơn đánh giá từ khách đã mua");
  response = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin/reviews/reply"),
  );
  await review
    .getByRole("button", { name: "Gửi phản hồi", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await buyer.goto("/san-pham/" + product.slug);
  await expect(buyer.getByText(text, { exact: true })).toBeVisible();
  await expect(
    buyer.getByText("Cửa hàng cảm ơn đánh giá từ khách đã mua", {
      exact: true,
    }),
  ).toBeVisible();
  } finally {
    await buyerContext.close();
  }
});

test("Business acceptance UI: registration profile and default shipping address", async ({
  page,
}) => {
  const email = "register-" + randomUUID() + "@uat.local",
    password = "Uat-" + randomUUID();
  await page.goto("/dang-ky");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Khách đăng ký UI");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="phone"]').fill("0912345678");
  await page
    .locator('input[name="password"]')
    .fill(password);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(password);
  let response = page.waitForResponse((r) => r.url().endsWith("/api/register"));
  await page
    .getByRole("button", { name: "TẠO TÀI KHOẢN", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  expect(user.role).toBe("CUSTOMER");
  await page.goto("/tai-khoan/thong-tin");
  const profile = page.locator(".account-content form").first();
  await profile
    .getByLabel("Họ và tên", { exact: true })
    .fill("Khách cập nhật UI");
  response = page.waitForResponse((r) => r.url().endsWith("/api/profile"));
  await profile
    .getByRole("button", { name: "LƯU THAY ĐỔI", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await page.goto("/tai-khoan/dia-chi");
  const form = page.locator(".account-content form").last();
  for (const [label, value] of Object.entries({
    "Tên người nhận": "Khách UI",
    "Số điện thoại": "0912345678",
    "Tỉnh / Thành phố": "Hưng Yên",
    "Phường / Xã": "Phường thử nghiệm",
    "Số nhà, tên đường": "123 Địa chỉ mặc định",
  }))
    await form.getByLabel(label, { exact: true }).fill(value);
  response = page.waitForResponse((r) => r.url().endsWith("/api/address"));
  await form.getByRole("button", { name: "LƯU THAY ĐỔI", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect
    .poll(() =>
      db.address.count({ where: { userId: user.id, isDefault: true } }),
    )
    .toBe(1);
});
