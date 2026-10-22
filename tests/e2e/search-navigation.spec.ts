import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
const { database } = JSON.parse(readFileSync(".test-credentials.json", "utf8"));
const db = new PrismaClient({ datasources: { db: { url: database } } });
test.afterAll(() => db.$disconnect());
async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("main.loading")).toBeHidden();
  await expect(page.locator("main:visible")).toBeVisible();
}
async function openSearch(page: Page) {
  const desktop = page.getByRole("button", {
    name: "Mở tìm kiếm",
    exact: true,
  });
  if (await desktop.isVisible()) await desktop.click();
  else
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  const input = page.getByRole("textbox", {
    name: "Từ khóa tìm kiếm",
    exact: true,
  });
  await expect(input).toBeFocused();
  return input;
}
async function metrics(page: Page) {
  return page.locator("header").evaluate((el) => {
    const r = el.getBoundingClientRect(),
      logo = el.querySelector(".brand-logo")!.getBoundingClientRect(),
      style = getComputedStyle(el);
    return {
      width: r.width,
      height: r.height,
      logoWidth: logo.width,
      logoHeight: logo.height,
      font: style.fontFamily,
      fontSize: style.fontSize,
    };
  });
}
async function capture(page: Page, name: string) {
  await ready(page);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `verification/navigation/${name}.png`,
    animations: "disabled",
    fullPage: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    name + " overflow",
  ).toBeTruthy();
}
async function compareHeader(page: Page, baseline: Buffer) {
  const current = await page.locator("header").screenshot({
    animations: "disabled",
    mask: [page.locator(".header-search input"), page.locator(".bag>span")],
    style: "header :focus-visible {outline:none!important}",
  });
  const a = await sharp(baseline).raw().toBuffer({ resolveWithObject: true }),
    b = await sharp(current).raw().toBuffer({ resolveWithObject: true });
  expect(b.info).toEqual(a.info);
  let changed = 0;
  for (let i = 0; i < a.data.length; i++)
    if (Math.abs(a.data[i] - b.data[i]) > 8) changed++;
  if (changed / a.data.length >= 0.001) {
    await mkdir("verification/debug", { recursive: true });
    await writeFile("verification/debug/header-before.png", baseline);
    await writeFile("verification/debug/header-after.png", current);
  }
  expect(changed / a.data.length).toBeLessThan(0.001);
}
for (const width of [375, 390, 768, 1024, 1280, 1440, 1920]) {
  test(`search and navigation remain stable at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const browserErrors: string[] = [];
    page.on("pageerror", (e) => browserErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && /hydrat|didn.t match/.test(m.text()))
        browserErrors.push(m.text());
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await ready(page);
    const initial = await metrics(page);
    await capture(page, `${width}-home-direct`);
    const header = await page.locator("header").screenshot({
      animations: "disabled",
      mask: [page.locator(".header-search input"), page.locator(".bag>span")],
      style: "header :focus-visible {outline:none!important}",
    });
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await page.getByText("Thời trang công sở", { exact: true }).click();
    await page
      .locator(".drawer-links")
      .getByText("Áo sơ mi", { exact: true })
      .click();
    await page
      .locator(".drawer-links")
      .getByRole("link", { name: "Tất cả áo sơ mi", exact: true })
      .click();
    await expect(page).toHaveURL(/ao-so-mi$/);
    await expect(page.locator(".catalog-grid .product-card")).toHaveCount(24);
    await ready(page);
    expect(await metrics(page)).toEqual(initial);
    await compareHeader(page, header);
    await capture(page, `${width}-category-navigation`);
    await page.reload();
    await ready(page);
    await compareHeader(page, header);
    await capture(page, `${width}-category-refresh`);
    const input = await openSearch(page);
    await input.fill("ao so mi");
    await expect(page.locator(".search-dialog .suggestion")).toHaveCount(4);
    await input.press("Enter");
    await expect(page).toHaveURL(/tim-kiem\?q=ao%20so%20mi/);
    await expect(page.locator(".nav-dialog")).not.toBeVisible();
    await ready(page);
    await expect(page.locator(".catalog-grid .product-card")).toHaveCount(24);
    expect(await metrics(page)).toEqual(initial);
    await compareHeader(page, header);
    await capture(page, `${width}-search-navigation`);
    const productLink = page.locator(".catalog-grid .product-name").first();
    const href = await productLink.getAttribute("href");
    await productLink.click();
    await expect(page).toHaveURL(new RegExp(href!));
    await ready(page);
    await capture(page, `${width}-product-navigation`);
    const detailMetrics = await metrics(page);
    await page.goBack();
    await ready(page);
    await expect(page.locator(".catalog-search input")).toHaveValue("ao so mi");
    await capture(page, `${width}-search-back`);
    await page.goForward();
    await ready(page);
    expect(await metrics(page)).toEqual(detailMetrics);
    await capture(page, `${width}-product-forward`);
    await page.reload();
    await ready(page);
    await capture(page, `${width}-product-refresh`);
    const swatches = page.locator(".color-options button");
    if ((await swatches.count()) > 1) {
      const firstSrc = await page
        .locator(".gallery-main img")
        .getAttribute("src");
      await swatches.nth(1).click();
      await expect(page.locator(".gallery-main img")).not.toHaveAttribute(
        "src",
        firstSrc!,
      );
    }
    await page.locator(".size-options button:not(:disabled)").first().click();
    await expect(
      page.getByText("Mã biến thể:", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true })
      .click();
    await expect(
      page.getByText("Đã thêm thiết kế vào túi mua sắm.", { exact: false }),
    ).toBeVisible();
    await page.locator("header .bag").click();
    await ready(page);
    await expect(page.locator(".cart-layout")).toBeVisible();
    await capture(page, `${width}-cart`);
    await page
      .getByRole("link", { name: /TIẾN HÀNH THANH TOÁN|THANH TOÁN/ })
      .first()
      .click();
    await ready(page);
    await capture(page, `${width}-checkout`);
    expect(await metrics(page)).toEqual(initial);
    await page.goto("/dang-nhap");
    await ready(page);
    await expect(page).toHaveTitle("Đăng nhập | HÀ NHI FASHION");
    await page.locator("header .wordmark").click();
    await expect(page).toHaveURL(/\/$/);
    await ready(page);
    expect(await metrics(page)).toEqual(initial);
    const again = await openSearch(page);
    await again.fill("zzzz-no-match");
    await page
      .locator(".search-dialog")
      .getByRole("button", { name: "Tìm kiếm", exact: true })
      .click();
    await expect(page).toHaveURL(/q=zzzz-no-match/);
    await expect(
      page.getByRole("heading", { name: "Chưa có thiết kế phù hợp" }),
    ).toBeVisible();
    await expect(page.locator(".product-card")).toHaveCount(0);
    const empty = await openSearch(page);
    await empty.fill("abc");
    await page.getByRole("button", { name: "Xóa tìm kiếm" }).click();
    await expect(empty).toHaveValue("");
    await empty.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Nàng muốn tìm thiết kế nào?" }),
    ).toBeVisible();
    expect(browserErrors).toEqual([]);
  });
}
test("suggestions handle keyboard, dismissal, failure and query races", async ({
  page,
}) => {
  await page.goto("/");
  const input = await openSearch(page);
  await input.fill("chan vay");
  await expect(page.locator(".search-dialog .suggestion")).toHaveCount(4);
  const href = await page
    .locator(".search-dialog .suggestion")
    .first()
    .getAttribute("href");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(new RegExp(href!));
  await ready(page);
  const again = await openSearch(page);
  await again.fill("dam cong so");
  await again.press("Escape");
  await expect(page.locator(".nav-dialog")).not.toBeVisible();
  await page.route("**/api/search?*", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "offline" }),
    }),
  );
  const fail = await openSearch(page);
  await fail.fill("quan tay be");
  await expect(page.locator(".search-dialog [role=alert]")).toBeVisible();
  await fail.press("Enter");
  await expect(page).toHaveURL(/quan%20tay%20be/);
  await expect(
    page.locator(".catalog-grid .product-card").first(),
  ).toBeVisible();
});
test("commercial readiness blocks unverified product assets and keeps media private", async ({
  page,
  request,
}) => {
  const p = await db.product.findFirstOrThrow({
    where: { enrichmentVersion: 1 },
  });
  await expect(
    (
      await request.post("/api/admin/publication", {
        data: {
          productId: p.id,
          merchandiseVerified: true,
          publicationStatus: "READY",
        },
      })
    ).status(),
  ).toBe(400);
  const creds = JSON.parse(readFileSync(".test-credentials.json", "utf8"));
  await page.goto("/dang-nhap");
  await page.getByLabel("Email", { exact: true }).fill(creds.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(creds.password);
  await page.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
  await expect(page).toHaveURL(/tai-khoan|admin/);
  const r = await page.request.post("/api/admin/publication", {
    data: {
      productId: p.id,
      merchandiseVerified: true,
      publicationStatus: "READY",
    },
  });
  expect(r.status()).toBe(400);
  await page.goto("/admin/thu-vien-anh?product=" + p.id);
  await expect(
    page.getByRole("heading", { name: "Thư viện ảnh & quyền sử dụng" }),
  ).toBeVisible();
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await capture(page, `${width}-admin-media`);
  }
  await page.getByRole("link", { name: "Sản phẩm", exact: true }).click();
  await expect(page).toHaveURL(/admin\/san-pham$/);
  await expect(page.getByText("Ảnh & duyệt mở bán").first()).toBeVisible();
});

test("older suggestion responses cannot replace a newer query", async ({
  page,
  request,
}) => {
  const oldData = await (
    await request.get("/api/search?suggest=1&q=ao")
  ).json();
  const newData = await (
    await request.get("/api/search?suggest=1&q=dam%20cong%20so")
  ).json();
  await page.route("**/api/search?*", async (r) => {
    const q = new URL(r.request().url()).searchParams.get("q");
    if (q === "ao")
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 600);
      });
    await r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(q === "ao" ? oldData : newData),
    });
  });
  await page.goto("/");
  const input = await openSearch(page);
  const oldRequest = page.waitForRequest(
    (r) => new URL(r.url()).searchParams.get("q") === "ao",
  );
  const oldResponse = page.waitForResponse(
    (r) => new URL(r.url()).searchParams.get("q") === "ao",
  );
  await input.fill("ao");
  await oldRequest;
  await input.fill("dam cong so");
  await expect(
    page.locator(".search-dialog .suggestion").first(),
  ).toContainText(newData.products[0].name);
  await oldResponse;
  await expect(
    page.locator(".search-dialog .suggestion").first(),
  ).toContainText(newData.products[0].name);
  await input.press("ArrowUp");
  await expect(page.locator(".search-dialog .suggestion").last()).toHaveClass(
    /selected/,
  );
});
test("color-filter links use the corresponding gallery and broken images have a stable fallback", async ({
  page,
}) => {
  await page.goto("/thoi-trang-cong-so?color=" + encodeURIComponent("Be cát"));
  await ready(page);
  const link = page.locator(".catalog-grid .product-name").first();
  const href = await link.getAttribute("href");
  expect(href).toContain("?mau=");
  const colorId = new URL(href!, "http://localhost").searchParams.get("mau")!;
  const color = await db.productColor.findUniqueOrThrow({
    where: { id: colorId },
    include: { images: { orderBy: { position: "asc" } } },
  });
  await link.click();
  await expect(page.locator(".color-options .chosen")).toHaveAttribute(
    "aria-label",
    color.name,
  );
  await expect
    .poll(
      async () =>
        new URL(
          (await page.locator(".gallery-main img").getAttribute("src"))!,
          page.url(),
        ).pathname,
    )
    .toBe(color.images[0].url);
  await page.route("**" + color.images[0].url, (r) =>
    r.fulfill({ status: 404, body: "" }),
  );
  await page.reload();
  await ready(page);
  await expect(page.locator(".gallery-main img")).toHaveAttribute(
    "src",
    /awaiting-photo\.svg$/,
  );
  await expect
    .poll(() =>
      page
        .locator(".gallery-main img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  const box = await page.locator(".gallery-main").boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(0.75, 2);
});
test("category route and subcategory filters remain aligned", async ({
  page,
}) => {
  await page.goto("/dam-cong-so");
  await ready(page);
  await expect(
    page.locator(".filter-sidebar").getByLabel("Danh mục", { exact: true }),
  ).toHaveValue("dam-cong-so");
  const options = await page
    .locator(".filter-sidebar")
    .getByLabel("Danh mục con", { exact: true })
    .locator("option")
    .allTextContents();
  expect(options.some((o) => o.includes("Sơ mi trắng"))).toBe(false);
  await page
    .locator(".filter-sidebar")
    .getByLabel("Danh mục", { exact: true })
    .selectOption("quan-tay");
  await expect(page).toHaveURL(/quan-tay/);
  await expect(
    page.getByRole("heading", { name: "Quần tây", exact: true }),
  ).toBeVisible();
});
test("variant-specific prices are consistent between product, cart and quote", async ({
  page,
}) => {
  const p = await db.product.findUniqueOrThrow({
    where: { sku: "HN002" },
    include: { variants: true },
  });
  const v = p.variants.find((v) => v.size === "M" && v.stock > 0)!;
  await db.productVariant.update({
    where: { id: v.id },
    data: { priceOverride: 1150000 },
  });
  try {
    await page.goto("/thoi-trang-cong-so?q=" + p.sku);
    await expect(page.locator(".product-card .price")).toContainText("Từ ");
    await page.goto("/san-pham/" + p.slug + "?mau=" + v.colorId);
    await page
      .locator(".size-options")
      .getByRole("button", { name: "M", exact: true })
      .click();
    await expect(page.locator(".detail-price")).toContainText("1.150.000đ");
    await page
      .getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true })
      .click();
    await expect(
      page.getByText("Đã thêm thiết kế vào túi mua sắm."),
    ).toBeVisible();
    const q = await page.request.post("/api/quote", { data: {} });
    expect(q.status()).toBe(200);
    expect((await q.json()).subtotal).toBe(1150000);
    await page.locator("header .bag").click();
    await expect(page.locator(".cart-item")).toContainText("1.150.000đ");
  } finally {
    await db.productVariant.update({
      where: { id: v.id },
      data: { priceOverride: v.priceOverride },
    });
  }
});
test("selected color survives cart back navigation and refresh", async ({
  page,
}) => {
  const p = await db.product.findUniqueOrThrow({ where: { sku: "HN002" } });
  await page.goto("/san-pham/" + p.slug);
  await ready(page);
  const swatch = page.locator(".color-options button").nth(1);
  const color = await swatch.getAttribute("aria-label");
  await swatch.click();
  const src = await page.locator(".gallery-main img").getAttribute("src");
  await page.locator(".size-options button:not(:disabled)").first().click();
  await page
    .getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true })
    .click();
  await expect(
    page.getByText("Đã thêm thiết kế vào túi mua sắm."),
  ).toBeVisible();
  await page.locator("header .bag").click();
  await expect(page).toHaveURL(/gio-hang$/);
  await expect(page.locator(".cart-layout")).toBeVisible();
  await ready(page);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp("/san-pham/" + p.slug));
  await ready(page);
  await expect(page.locator(".color-options .chosen")).toHaveAttribute(
    "aria-label",
    color!,
  );
  await expect
    .poll(
      async () =>
        new URL(
          (await page.locator(".gallery-main img").getAttribute("src"))!,
          page.url(),
        ).pathname,
    )
    .toBe(new URL(src!, page.url()).pathname);
  await page.reload();
  await ready(page);
  await expect(page.locator(".color-options .chosen")).toHaveAttribute(
    "aria-label",
    color!,
  );
});
test("search opened while a route is still loading remains usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const intercepted = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/*", async (r) => {
    const u = new URL(r.request().url()),
      h = r.request().headers();
    if (u.pathname === "/" && h.rsc === "1" && !h["next-router-prefetch"]) {
      started();
      await gate;
    }
    await r.continue();
  });
  await page.goto("/dang-nhap");
  await ready(page);
  await page.locator("header .wordmark").click();
  await intercepted;
  const input = await openSearch(page);
  await input.fill("quan tay");
  release();
  await expect(page).toHaveURL(/\/$/);
  await ready(page);
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("quan tay");
  await page
    .locator(".search-dialog")
    .getByRole("button", { name: "Tìm kiếm", exact: true })
    .click();
  await expect(page).toHaveURL(/q=quan%20tay/);
  await expect(
    page.locator(".catalog-grid .product-card").first(),
  ).toBeVisible();
});
