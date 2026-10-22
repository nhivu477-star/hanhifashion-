import { PrismaClient } from "@prisma/client";
import { readFile, writeFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
import { catalogQuery } from "../src/lib/queries";
const db = new PrismaClient();
const m = JSON.parse(
  await readFile("scripts/data/lsoul-manifest.json", "utf8"),
);
const ps = await db.product.findMany({
  where: { active: true },
  include: {
    images: true,
    category: true,
    subcategory: true,
    colors: {
      where: { active: true },
      include: { images: true, variants: true },
    },
  },
});
assert.equal(ps.length, m.designs.length);
assert.equal(new Set(ps.map((p) => p.slug)).size, ps.length);
let colors = 0,
  assets = 0;
const files: string[] = [];
for (const r of m.designs) {
  const p = ps.find((p) => p.slug === r.slug)!;
  assert(p, r.slug);
  assert.equal(p.price, r.price);
  assert.equal(p.colors.length, r.colors.length);
  assert.equal(p.subcategory?.slug ?? p.category.slug, r.category);
  assert(p.images.length);
  for (const c of r.colors) {
    const pc = p.colors.find((x) => x.name === c.name)!;
    assert(pc);
    assert.equal(pc.images.length, c.localImages.length);
    assert.equal(pc.variants.length, c.sizes.length);
    assert(pc.variants.every((v) => v.priceOverride === null));
    assert.deepEqual(
      pc.images.map((i) => i.url).sort(),
      [...c.localImages].sort(),
    );
    files.push(...c.localImages.map((x: string) => "public" + x));
    colors++;
  }
}
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < files.length) {
      const f = files[next++];
      assert((await stat(f)).size > 1000, f);
      const meta = await sharp(f).metadata();
      assert(meta.width && meta.height);
      assets++;
    }
  }),
);
const all = await catalogQuery({});
assert.equal(all.count, ps.length);
for (const slug of [
  "trang-phuc",
  "ao",
  "dam",
  "quan-vay",
  "bo-trang-phuc",
  "giay",
  "tui-xach",
  "phu-kien",
]) {
  const q = await catalogQuery({}, slug);
  assert(q.count > 0, slug);
}
const report = {
  passed: true,
  designs: ps.length,
  colors,
  assets,
  sourceListings: m.sourceListings,
  sourceCounts: m.sourceCounts,
  categories: [
    ...new Set(ps.map((p) => p.subcategory?.slug ?? p.category.slug)),
  ],
};
await writeFile(
  "verification/lsoul-consistency-check.json",
  JSON.stringify(report, null, 2),
);
console.log(report);
await db.$disconnect();
