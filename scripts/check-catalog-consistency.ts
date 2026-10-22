import { PrismaClient } from "@prisma/client";
import { readFile, writeFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
import { catalogQuery } from "../src/lib/queries";
import { productAlias } from "../src/lib/product-alias";
const d = new PrismaClient();
const rows = JSON.parse(
  await readFile("scripts/data/office-photo-sources.json", "utf8"),
);
const ps = await d.product.findMany({
  where: { active: true },
  include: {
    images: true,
    category: true,
    subcategory: true,
    colors: {
      where: { active: true },
      include: { images: true, variants: true },
    },
    variants: true,
  },
});
assert.equal(ps.length, rows.length);
assert.equal(new Set(ps.map((p) => p.slug)).size, ps.length);
assert.equal(new Set(ps.map((p) => p.name)).size, ps.length);
const allCovers = new Set<string>();
let colorCount = 0;
let localAssets = 0;
const modelSetting = await d.storeSetting.findUniqueOrThrow({
  where: { key: "colorModelPreviews" },
});
const models = JSON.parse(modelSetting.value);
for (const p of ps) {
  const r = rows.find((r: any) => r.slug === p.slug);
  assert(r, p.slug);
  assert.equal(p.category.slug, r.category);
  assert.equal(p.subcategory?.slug, r.subcategory);
  assert.equal(p.subcategory?.parentId, p.categoryId);
  assert.equal(p.price, r.price);
  assert.equal(p.salePrice, null);
  assert.equal(p.colors.length, r.colors.length);
  assert(
    !allCovers.has(p.images[0].url),
    "Duplicate model-photo product: " + p.slug,
  );
  allCovers.add(p.images[0].url);
  const colorIds = new Set(p.colors.map((c) => c.id));
  assert(
    !p.variants.some((v) => !v.colorId),
    "Unlinked variant could expose an obsolete color",
  );
  for (const c of p.colors) {
    colorCount++;
    const detail = c.images.map((i) => i.url);
    assert(detail.length);
    assert(detail.every((path) => path.includes("-detail-")));
    assert(models[c.id]?.length);
    assert(models[c.id].every((i: any) => !detail.includes(i.url)));
    assert.equal(c.variants.length, 6);
    assert(
      c.variants.every(
        (v) =>
          v.priceOverride === null &&
          v.productId === p.id &&
          v.color === c.name,
      ),
    );
    for (const path of [...detail, ...models[c.id].map((i: any) => i.url)]) {
      await access("public" + path);
      localAssets++;
    }
  }
  assert(
    p.variants
      .filter((v) => v.colorId && colorIds.has(v.colorId))
      .every((v) => v.priceOverride === null),
  );
  const result = await catalogQuery({ q: p.name });
  assert(result.products.some((x) => x.id === p.id));
}
const aliases = JSON.parse(
  (await d.storeSetting.findUniqueOrThrow({ where: { key: "productAliases" } }))
    .value,
);
for (const [old, target] of Object.entries(aliases)) {
  assert(ps.some((p) => p.slug === target));
  assert.equal(await productAlias(old), "/san-pham/" + target);
}
const cat = await catalogQuery({});
assert.equal(cat.count, ps.length);
assert.equal(new Set(cat.products.map((p) => p.id)).size, ps.length);
const colored = await catalogQuery({ color: "Xanh dương nhạt" });
assert.equal(colored.count, 2);
assert(
  colored.products.every((p) =>
    p.images.every((i: { url: string }) => !i.url.includes("-detail-")),
  ),
);
const report = {
  passed: true,
  activeProducts: ps.length,
  uniqueDesigns: rows.length,
  activeColorways: colorCount,
  checkedLocalImages: localAssets,
  redirectedOldSlugs: Object.keys(aliases).length,
  classification:
    "All primary/subcategory parent relations match the curated source manifest",
  pricing: "One base price per design; no active color or size price overrides",
  imagery:
    "Model images in listings, product-only source photographs in detail galleries",
};
await writeFile(
  "verification/catalog-consistency-check.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
await d.$disconnect();
