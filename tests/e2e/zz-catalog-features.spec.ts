import { test, expect, type Locator } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { enrichCatalog } from "../../scripts/enrich-catalog";
async function expectImage(image: Locator, path: string) {
  await expect
    .poll(async () => {
      const src = await image.getAttribute("src");
      if (!src) return "";
      const url = new URL(src, "http://127.0.0.1:3100");
      return url.pathname === "/_next/image"
        ? url.searchParams.get("url")
        : url.pathname;
    })
    .toBe(path);
}
const { database } = JSON.parse(readFileSync(".test-credentials.json", "utf8"));
const db = new PrismaClient({ datasources: { db: { url: database } } });
const include = {
  category: true,
  colors: {
    orderBy: { position: "asc" as const },
    include: {
      images: { orderBy: { position: "asc" as const } },
      variants: true,
      outfits: { include: { items: true } },
    },
  },
  variants: true,
};
const product = () =>
  db.product.findUniqueOrThrow({ where: { sku: "HN002" }, include });
test.afterAll(() => db.$disconnect());
test("32 reproducible enrichment preserves IDs, inventory, prices and existing transactions", async () => {
  const before = await db.product.findMany({
    select: {
      id: true,
      sku: true,
      price: true,
      salePrice: true,
      variants: {
        select: { id: true, sku: true, stock: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });
  const counts = await Promise.all([
    db.order.count(),
    db.cartItem.count(),
    db.orderItem.count(),
    db.productColor.count(),
    db.outfitCombination.count(),
  ]);
  await enrichCatalog(db);
  expect(
    await db.product.findMany({
      select: {
        id: true,
        sku: true,
        price: true,
        salePrice: true,
        variants: {
          select: { id: true, sku: true, stock: true },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    }),
  ).toEqual(before);
  expect(
    await Promise.all([
      db.order.count(),
      db.cartItem.count(),
      db.orderItem.count(),
      db.productColor.count(),
      db.outfitCombination.count(),
    ]),
  ).toEqual(counts);
  const products = await db.product.findMany({
    where: { enrichmentVersion: { gte: 1 } },
    include,
  });
  expect(products).toHaveLength(320);
  expect(new Set(products.map((p) => p.name)).size).toBe(320);
  for (const p of products) {
    expect(p.colors.length).toBeGreaterThanOrEqual(2);
    expect(p.colors.length).toBeLessThanOrEqual(5);
    expect(p.details).toBeTruthy();
    expect(p.care).toBeTruthy();
    expect(p.description).not.toMatch(/AI-generated|tạo bởi AI|AI mockup/);
    for (const c of p.colors) {
      expect(c.images).toHaveLength(3);
      expect(c.outfits.length).toBeGreaterThanOrEqual(2);
      for (const img of c.images)
        expect(readFileSync("public" + img.url, "utf8")).toContain(c.hex);
    }
    for (const v of p.variants)
      expect(
        p.colors.some(
          (c) =>
            c.id === v.colorId && c.name === v.color && c.hex === v.colorHex,
        ),
      ).toBe(true);
  }
});
test("33 card links, color gallery and actual styling colors stay connected", async ({
  page,
}) => {
  const p = await product();
  await page.goto("/san-pham/" + p.slug);
  await expect(page.locator("h1")).toHaveText(p.name);
  for (const c of p.colors) {
    await page
      .locator(".color-options")
      .getByRole("button", { name: c.name, exact: true })
      .click();
    await expectImage(page.locator(".gallery-main img"), c.images[0].url);
    await expect(page.locator(".outfit-suggestions")).toContainText(
      "Dành cho màu " + c.name,
    );
  }
  const link = page.locator(".outfit-grid a").first();
  const href = await link.getAttribute("href");
  expect(href).toContain("?mau=");
  const targetColor = await db.productColor.findUniqueOrThrow({
    where: { id: href!.split("?mau=")[1] },
    include: { images: { orderBy: { position: "asc" } } },
  });
  await link.click();
  await expect(page.locator(".color-options .chosen")).toHaveAttribute(
    "aria-label",
    targetColor.name,
  );
  await expectImage(
    page.locator(".gallery-main img"),
    targetColor.images[0].url,
  );
  await page.goto("/ao-so-mi");
  const card = page.locator(".product-card").first();
  const detail = await card.locator(".product-name").getAttribute("href");
  await card.locator(".product-picture a").click();
  await expect(page).toHaveURL(new RegExp(detail!));
});
test("34 size advisor required-only, optional refinement, selection and local privacy", async ({
  page,
}) => {
  const p = await product();
  await page.goto("/san-pham/" + p.slug);
  const apiPayloads: string[] = [];
  page.on("request", (r) => {
    if (r.postData()) apiPayloads.push(r.postData()!);
  });
  const storageBefore = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  await page
    .getByRole("button", { name: "TƯ VẤN CHỌN SIZE", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "TƯ VẤN CHỌN SIZE CÙNG HÀ NHI",
  });
  await modal
    .getByRole("button", { name: "XEM SIZE GỢI Ý", exact: true })
    .click();
  await expect(
    modal.getByText("Vui lòng nhập chiều cao của nàng."),
  ).toBeVisible();
  await expect(
    modal.getByText("Vui lòng nhập cân nặng để HÀ NHI có thể gợi ý kích cỡ."),
  ).toBeVisible();
  await modal.locator("[name=height]").fill("160.5");
  await modal.locator("[name=weight]").fill("51");
  await modal
    .getByRole("button", { name: "XEM SIZE GỢI Ý", exact: true })
    .click();
  await expect(
    modal.getByRole("heading", { name: "HÀ NHI GỢI Ý SIZE M CHO NÀNG" }),
  ).toBeVisible();
  await modal.locator("[name=bust]").fill("90");
  await modal
    .getByRole("button", { name: "XEM SIZE GỢI Ý", exact: true })
    .click();
  await expect(
    modal.getByRole("heading", { name: "HÀ NHI GỢI Ý SIZE L CHO NÀNG" }),
  ).toBeVisible();
  await modal.getByRole("button", { name: "CHỌN SIZE L", exact: true }).click();
  await expect(page.locator(".size-options .chosen")).toHaveText("L");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(apiPayloads.join("\n")).not.toMatch(
    /160\.5|"height"|"weight"|"bust"|"waist"|"hips"/i,
  );
  expect(
    await page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
    })),
  ).toEqual(storageBefore);
  expect(page.url()).not.toContain("160");
  await page
    .getByRole("button", { name: "TƯ VẤN CHỌN SIZE", exact: true })
    .click();
  await expect(modal.locator("[name=height]")).toHaveValue("");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "TƯ VẤN CHỌN SIZE", exact: true })
    .click();
  await modal.locator("[name=height]").fill("160");
  await modal.locator("[name=weight]").fill("51");
  await modal.locator("[name=bust]").fill("250");
  await modal
    .getByRole("button", { name: "XEM SIZE GỢI Ý", exact: true })
    .click();
  await expect(
    modal.getByRole("heading", { name: "ĐỐI CHIẾU THÊM BẢNG SIZE" }),
  ).toBeVisible();
  await expect(
    modal.getByRole("link", { name: "NHẮN TIN TƯ VẤN SIZE" }),
  ).toHaveAttribute("href", "https://ig.me/m/ha_nhi.05");
  await expect(modal.getByRole("button", { name: /^CHỌN SIZE / })).toHaveCount(
    0,
  );
});
test("35 out-of-stock recommendation explains availability without substitution", async ({
  page,
}) => {
  const p = await product();
  const c = p.colors[0];
  const v = c.variants.find((v) => v.size === "M")!;
  const old = v.stock;
  await db.productVariant.update({ where: { id: v.id }, data: { stock: 0 } });
  try {
    await page.goto("/san-pham/" + p.slug);
    await page
      .getByRole("button", { name: "TƯ VẤN CHỌN SIZE", exact: true })
      .click();
    const m = page.locator(".size-advisor");
    await m.locator("[name=height]").fill("160");
    await m.locator("[name=weight]").fill("51");
    await m
      .getByRole("button", { name: "XEM SIZE GỢI Ý", exact: true })
      .click();
    await expect(m).toContainText("kích cỡ này hiện chưa có sẵn");
    await expect(
      m.getByRole("button", { name: "CHỌN SIZE M", exact: true }),
    ).toHaveCount(0);
    await expect(
      m.getByRole("heading", { name: "HÀ NHI GỢI Ý SIZE M CHO NÀNG" }),
    ).toBeVisible();
  } finally {
    await db.productVariant.update({
      where: { id: v.id },
      data: { stock: old },
    });
  }
});
test("36 mobile modal, chart, validation, focus and no horizontal overflow", async ({
  page,
}) => {
  const p = await product();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/san-pham/" + p.slug);
    await page
      .getByRole("button", { name: "HƯỚNG DẪN CHỌN SIZE", exact: true })
      .click();
    const modal = page.locator(".size-advisor");
    await expect(modal.locator("table")).toBeVisible();
    await modal
      .getByRole("button", { name: "TƯ VẤN CHỌN SIZE", exact: true })
      .click();
    await modal.locator("[name=height]").fill("-1");
    await modal.locator("[name=weight]").fill("0");
    await modal
      .getByRole("button", { name: "XEM SIZE GỢI Ý", exact: true })
      .click();
    await expect(modal.locator("[role=alert]")).toHaveCount(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({ path: `output/size-advisor-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "HƯỚNG DẪN CHỌN SIZE", exact: true }),
    ).toBeFocused();
  }
});
test("37 variant image stays correct through cart and COD order snapshot", async ({
  page,
}) => {
  const p = await product();
  const email = `colors-${crypto.randomUUID()}@hanhi.test`;
  const password = `Customer-test-${crypto.randomUUID()}`;
  expect(
    (
      await page.request.post("/api/register", {
        data: {
          name: "Khách Kiểm Thử",
          phone: "0912345678",
          email,
          password,
          confirmPassword: password,
        },
      })
    ).status(),
  ).toBe(200);
  const c = p.colors[1];
  await page.goto("/san-pham/" + p.slug);
  await page
    .locator(".color-options")
    .getByRole("button", { name: c.name, exact: true })
    .click();
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
  await expectImage(page.locator(".cart-item img"), c.images[0].url);
  const idempotencyKey = crypto.randomUUID();
  const checkout = await page.request.post("/api/checkout", {
    data: {
      name: "Khách Kiểm Thử",
      phone: "0912345678",
      email,
      province: "Hà Nội",
      ward: "Phường Thử Nghiệm",
      street: "Số 1 đường kiểm thử",
      details: "",
      notes: "",
      idempotencyKey,
    },
  });
  expect(checkout.status()).toBe(200);
  const order = await db.order.findUniqueOrThrow({
    where: { idempotencyKey },
    include: { items: true },
  });
  expect(order.status).toBe("PENDING");
  expect(order.paymentStatus).toBe("UNPAID");
  expect(order.items).toHaveLength(1);
  expect(order.items[0].image).toBe(c.images[0].url);
  expect(order.items[0].color).toBe(c.name);
});
test("38 admin color, outfits, per-product chart and validation are persisted and authorized", async ({
  request,
  page,
}) => {
  const p = await product();
  const c = p.colors[0];
  const guest = await request.post("/api/admin/color", {
    data: { productId: p.id, name: "QA", hex: "#ffffff" },
  });
  expect(guest.status()).toBe(403);
  const creds = JSON.parse(readFileSync(".test-credentials.json", "utf8"));
  expect((await request.post("/api/login", { data: creds })).status()).toBe(
    200,
  );
  const color = await request.post("/api/admin/color", {
    data: {
      productId: p.id,
      name: "Màu QA",
      hex: "#DDCCBB",
      position: 99,
      imagesText: c.images.map((i) => i.url).join("\n"),
    },
  });
  expect(color.status()).toBe(200);
  const colorId = (await color.json()).id;
  const v = await request.post("/api/admin/variant", {
    data: {
      productId: p.id,
      sku: "QA-FREE-COLOR",
      size: "Free size",
      color: "Màu QA",
      colorHex: "#DDCCBB",
      stock: 3,
    },
  });
  expect(v.status()).toBe(200);
  expect(
    (
      await request.post("/api/admin/color", {
        data: {
          id: colorId,
          productId: p.id,
          name: "Màu QA mới",
          hex: "#CCDDEE",
          position: 99,
          imagesText: c.images.map((i) => i.url).join("\n"),
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    await db.productVariant.findUniqueOrThrow({
      where: { sku: "QA-FREE-COLOR" },
    }),
  ).toMatchObject({
    color: "Màu QA mới",
    colorHex: "#CCDDEE",
    stock: 3,
    colorId,
  });
  const target = await db.productColor.findFirstOrThrow({
    where: {
      productId: { not: p.id },
      variants: { some: { stock: { gt: 0 } } },
    },
    include: { product: true },
  });
  const outfit = await request.post("/api/admin/outfit", {
    data: {
      colorId,
      productId: target.productId,
      targetColorId: target.id,
      title: "Phối đồ thử nghiệm",
    },
  });
  expect(outfit.status()).toBe(200);
  const outfitId = (await outfit.json()).id;
  expect(
    (
      await db.outfitCombination.findUniqueOrThrow({
        where: { id: outfitId },
        include: { items: true },
      })
    ).items[0].productId,
  ).toBe(target.productId);
  const data = {
    productId: p.id,
    categoryId: p.categoryId,
    scope: "product",
    kind: "top",
    notes: "Bảng ghi đè kiểm thử",
    rowsJson: JSON.stringify([
      { size: "M", bust: [84, 88], length: 62, shoulder: 37 },
    ]),
    matrixJson: JSON.stringify([
      { size: "M", height: [150, 175], weight: [45, 60] },
    ]),
  };
  expect((await request.post("/api/admin/size-chart", { data })).status()).toBe(
    200,
  );
  expect(
    (await db.sizeChart.findUniqueOrThrow({ where: { productId: p.id } }))
      .notes,
  ).toBe(data.notes);
  expect(
    (
      await request.post("/api/admin/size-chart", {
        data: { ...data, rowsJson: "invalid" },
      })
    ).status(),
  ).toBe(400);
  await page.goto("/san-pham/" + p.slug);
  await page
    .getByRole("button", { name: "HƯỚNG DẪN CHỌN SIZE", exact: true })
    .click();
  await expect(page.locator(".size-advisor")).toContainText(data.notes);
  await expect(page.locator(".size-advisor")).toContainText("62");
  await page.keyboard.press("Escape");
  await db.sizeChart.delete({ where: { productId: p.id } });
  await db.outfitCombination.delete({ where: { id: outfitId } });
  await db.inventoryMovement.deleteMany({
    where: { variant: { sku: "QA-FREE-COLOR" } },
  });
  await db.productVariant.delete({ where: { sku: "QA-FREE-COLOR" } });
  await db.productColor.delete({ where: { id: colorId } });
  await page.request.post("/api/login", { data: creds });
  await page.goto("/admin/san-pham/" + p.id);
  await expect(
    page.getByRole("heading", { name: "Màu sắc, hình ảnh & phối đồ" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bảng size & quy tắc tư vấn" }),
  ).toBeVisible();
});
test("39 styling excludes sold out or archived products", async ({ page }) => {
  const p = await product();
  const outfit = p.colors[0].outfits[0];
  const item = outfit.items[0];
  const old = await db.product.findUniqueOrThrow({
    where: { id: item.productId },
  });
  await db.product.update({
    where: { id: item.productId },
    data: { active: false },
  });
  try {
    await page.goto("/san-pham/" + p.slug);
    await expect(
      page.locator('.outfit-grid a[href*="' + old.slug + '"]'),
    ).toHaveCount(0);
  } finally {
    await db.product.update({
      where: { id: item.productId },
      data: { active: old.active },
    });
  }
});
test("40 enrichment preserves a manually entered HN-prefixed product", async () => {
  const category = await db.category.findUniqueOrThrow({
    where: { slug: "ao-so-mi" },
  });
  const manual = await db.product.create({
    data: {
      name: "Sơ mi đặt may riêng của cửa hàng",
      slug: "qa-manual-protected-design",
      sku: "HN-EDITOR-PROTECTED",
      description: "Nội dung biên tập riêng cần được giữ nguyên.",
      material: "Cotton",
      style: "Tối giản",
      fit: "Regular Fit",
      occasion: "Daily Office",
      price: 765000,
      active: false,
      searchText: "qa manual",
      categoryId: category.id,
    },
  });
  try {
    await enrichCatalog(db);
    expect(
      await db.product.findUniqueOrThrow({ where: { id: manual.id } }),
    ).toEqual(manual);
  } finally {
    await db.product.delete({ where: { id: manual.id } });
  }
});
