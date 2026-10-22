import sharp from "sharp";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { qualityInclude, productQuality } from "../../src/lib/product-quality";
import { inspectLocalImage } from "../../src/lib/local-images";
import { safeLogRecord } from "../../src/lib/observability";
import { randomUUID } from "node:crypto";
if (!/^file:\.\/business-tests-[\w-]+\.db$/.test(process.env.DATABASE_URL ?? ""))
  throw Error("Catalog operations isolated database only");
const db = new PrismaClient();
const fixtures = JSON.parse(
  await readFile("verification/business-fixtures.json", "utf8"),
);
const base = "http://127.0.0.1:3101";
let cookie = "";
async function req(path: string, data?: unknown, auth = true) {
  const r = await fetch(base + path, {
    method: data === undefined ? "GET" : "POST",
    redirect: "manual",
    headers: {
      ...(auth ? { cookie } : {}),
      ...(data === undefined
        ? {}
        : { "Content-Type": "application/json", origin: base }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const text = await r.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return { r, body, text };
}
const login = await req(
  "/api/login",
  { email: fixtures.users[0].email, password: fixtures.users[0].password },
  false,
);
assert.equal(login.r.status, 200);
cookie = login.r.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
const results: { test: string; status: string; error?: string }[] = [];
async function run(test: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ test, status: "PASS" });
    console.log("PASS", test);
  } catch (e) {
    results.push({ test, status: "FAIL", error: String(e) });
    console.log("FAIL", test, String(e).slice(0, 500));
  }
}
const p = await db.product.findUniqueOrThrow({
  where: {
    id:
      fixtures.products?.[0]?.id ??
      fixtures.fixtures?.[0]?.id ??
      (await db.product.findFirstOrThrow()).id,
  },
  include: qualityInclude,
});
const v = p.variants[0];
await run("01 readiness report is separate from publication", async () => {
  const before = p.publicationStatus;
  const q = productQuality(p);
  assert(["READY", "NEEDS REVIEW", "INCOMPLETE", "INVALID"].includes(q.status));
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: p.id } }))
      .publicationStatus,
    before,
  );
});
await run("02 duplicate variant SKU rejected atomically", async () => {
  const other = await db.productVariant.findFirstOrThrow({
    where: { id: { not: v.id } },
  });
  const r = await req("/api/admin/variant", { ...v, sku: other.sku });
  assert.equal(r.r.status, 400);
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).sku,
    v.sku,
  );
});
await run("03 invalid selling and discount prices rejected", async () => {
  for (const prices of [
    { price: 0, salePrice: null },
    { price: 100, salePrice: 150 },
  ]) {
    const r = await req("/api/admin/product", {
      ...p,
      ...prices,
      image: p.images[0].url,
      active: true,
    });
    assert.equal(r.r.status, 400);
  }
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: p.id } })).price,
    p.price,
  );
});
await run("04 image mapping and missing color safety", async () => {
  const html = (await req("/san-pham/" + p.slug)).text;
  assert(html.includes(p.name));
  const c = await db.productColor.findFirst({ where: { productId: p.id } });
  if (c) {
    const images = await db.colorImage.findMany({
      where: { colorId: c.id },
      include: { color: true },
    });
    assert(images.every((i) => i.color.productId === p.id));
  }
});
await run("05 fallback file validated and delivered", async () => {
  assert((await inspectLocalImage("/images/awaiting-photo.svg")).bytes > 0);
  assert.equal((await req("/images/awaiting-photo.svg")).r.status, 200);
});
await run("06 unauthorized upload denied before parsing file", async () => {
  const f = new FormData();
  f.set("file", new Blob(["test"]), "test.png");
  const r = await fetch(base + "/api/admin/upload", {
    method: "POST",
    headers: { origin: base },
    body: f,
  });
  assert.notEqual(r.status, 200);
});
await run("07 invalid file content rejected", async () => {
  const f = new FormData();
  f.set(
    "file",
    new Blob(["<script>bad</script>"], { type: "image/png" }),
    "test.png",
  );
  const r = await fetch(base + "/api/admin/upload", {
    method: "POST",
    headers: { origin: base, cookie },
    body: f,
  });
  assert.equal(r.status, 400);
});
await run("valid raster upload is decoded and stored locally", async () => {
  const bytes = await sharp({
    create: { width: 16, height: 16, channels: 3, background: "#eeeeee" },
  })
    .png()
    .toBuffer();
  const f = new FormData();
  f.set(
    "file",
    new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    "catalog-fixture.png",
  );
  const r = await fetch(base + "/api/admin/upload", {
    method: "POST",
    headers: { origin: base, cookie },
    body: f,
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert(/^\/uploads\/[a-f0-9]+\.webp$/.test(body.url));
  assert.equal((await inspectLocalImage(body.url)).format, "webp");
});
await run("08 referenced image cannot be removed", async () => {
  const a = await db.mediaAsset.create({
    data: {
      localPath: "/uploads/catalog-fixture-" + randomUUID() + ".webp",
      originalSourceUrl: "https://local.invalid/fixture",
      licenseType: "UNKNOWN",
      licenseReference: "test only",
      authorizedUse: "LOCAL_PREVIEW_ONLY",
    },
  });
  await db.productImage.create({
    data: {
      productId: p.id,
      url: a.localPath,
      alt: "QA catalog",
      position: 99,
      mediaAssetId: a.id,
    },
  });
  const r = await req("/api/admin/media-delete", {
    id: a.id,
    reason: "Kiểm thử tham chiếu đang tồn tại",
  });
  assert.equal(r.r.status, 400);
  assert(await db.mediaAsset.findUnique({ where: { id: a.id } }));
});
await run("12 login context and external redirect rejection", async () => {
  for (const [returnTo, expected] of [
    ["/thanh-toan?from=cart", "/thanh-toan?from=cart"],
    ["//evil.invalid", "/admin"],
  ]) {
    const r = await req(
      "/api/login",
      {
        email: fixtures.users[0].email,
        password: fixtures.users[0].password,
        returnTo,
      },
      false,
    );
    assert.equal(r.body.redirect, expected);
  }
  const h = (await req("/admin/kho-hang?q=QA", undefined, false)).text;
  assert(h.includes("returnTo"));
});
await run("13 historical item prices unchanged by quality audit", async () => {
  const before = await db.orderItem.findMany();
  productQuality(p);
  assert.deepEqual(await db.orderItem.findMany(), before);
});
await run(
  "17-20 consistent backup, integrity, isolated restore, FK and content",
  async () => {
    const r = JSON.parse(
      execFileSync(
        "python3",
        [
          "scripts/local-backup.py",
          "--source",
          "prisma/" + process.env.DATABASE_URL!.slice(7),
        ],
        { encoding: "utf8" },
      ),
    );
    assert(r.allTablesAndContentsEqual);
    assert.deepEqual(r.integrity, [["ok"]]);
    assert.equal(r.foreignKeys.length, 0);
    assert.notEqual(r.backup, r.isolatedRestore);
    await writeFile(
      "verification/catalog-backup.json",
      JSON.stringify(r, null, 2),
    );
  },
);
await run("26 catalog query bounded and timed", async () => {
  const t = performance.now();
  const r = await req("/trang-phuc");
  assert.equal(r.r.status, 200);
  assert((r.text.match(/class="product-card"/g) ?? []).length <= 24);
  await writeFile(
    "verification/catalog-performance.json",
    JSON.stringify(
      { durationMs: performance.now() - t, bytes: Buffer.byteLength(r.text) },
      null,
      2,
    ),
  );
});
await run(
  "27 structured logs contain no arbitrary sensitive fields",
  async () => {
    const s = JSON.stringify(
      safeLogRecord("secret", "password", "phone", "token"),
    );
    assert(!/secret|password|phone|token/.test(s));
    const r = await req("/api/admin/variant", { secret: "NEVER_LOG_SENSITIVE" });
    assert(r.body.requestId);
    assert(!JSON.stringify(r.body).includes("NEVER_LOG_SENSITIVE"));
    assert.equal(r.r.headers.get("x-request-id"), r.body.requestId);
  },
);
await run("28 admin product pagination and quality indicators", async () => {
  const h = (await req("/admin/san-pham")).text;
  assert(h.includes("Chất lượng dữ liệu"));
  assert(h.includes("Phân trang quản trị"));
  assert(
    (h.match(/<summary>Chi tiết kiểm tra<\/summary>/g) ?? []).length <= 24,
  );
  assert((await req("/admin/don-hang")).text.includes("Phân trang quản trị"));
});
await run("media traversal rejected without data mutation", async () => {
  const r = await req("/api/admin/color", {
    productId: p.id,
    name: "QA safe",
    hex: "#eeeeee",
    imagesText: "/images/../secret.png",
  });
  assert.equal(r.r.status, 400);
  assert.equal(
    await db.productColor.count({
      where: { productId: p.id, name: "QA safe" },
    }),
    0,
  );
});
await run(
  "unreferenced metadata deletion retains file architecture",
  async () => {
    const a = await db.mediaAsset.create({
      data: {
        localPath: "/uploads/unreferenced-" + randomUUID() + ".webp",
        originalSourceUrl: "https://local.invalid/fixture",
        licenseType: "UNKNOWN",
        licenseReference: "test only",
        authorizedUse: "LOCAL_PREVIEW_ONLY",
      },
    });
    assert.equal(
      (
        await req("/api/admin/media-delete", {
          id: a.id,
          reason: "Xóa metadata QA không được tham chiếu",
        })
      ).r.status,
      200,
    );
    assert.equal(await db.mediaAsset.findUnique({ where: { id: a.id } }), null);
  },
);
await writeFile(
  "verification/catalog-operations-results.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      database: process.env.DATABASE_URL,
      results,
    },
    null,
    2,
  ),
);
await db.$disconnect();
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
