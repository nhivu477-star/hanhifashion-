import { db } from "../src/lib/db";
import { qualityInclude, productQuality } from "../src/lib/product-quality";
import { inspectLocalImage } from "../src/lib/local-images";
import { writeFile } from "node:fs/promises";
const products = await db.product.findMany({ include: qualityInclude });
const urls = [
  ...new Set(
    products.flatMap((p) =>
      [...p.images, ...p.colors.flatMap((c) => c.images)].map((i) => i.url),
    ),
  ),
];
const media = [];
const unavailable = new Set<string>();
for (const url of urls) {
  try {
    media.push({ url, ...(await inspectLocalImage(url)), status: "AVAILABLE" });
  } catch {
    unavailable.add(url);
    media.push({ url, status: "UNAVAILABLE_OR_INVALID" });
  }
}
const records = products.map((p) => ({
  id: p.id,
  sku: p.sku,
  name: p.name,
  active: p.active,
  publicationStatus: p.publicationStatus,
  ...productQuality(p, unavailable),
}));
const summary = Object.fromEntries(
  ["READY", "NEEDS REVIEW", "INCOMPLETE", "INVALID"].map((s) => [
    s,
    records.filter((p) => p.status === s).length,
  ]),
);
await writeFile(
  "verification/product-quality.json",
  JSON.stringify({ at: new Date().toISOString(), summary, records }, null, 2),
);
await writeFile(
  "verification/media-audit.json",
  JSON.stringify(
    { total: urls.length, unavailable: unavailable.size, media },
    null,
    2,
  ),
);
console.log({
  products: products.length,
  summary,
  images: urls.length,
  unavailable: unavailable.size,
});
await db.$disconnect();
