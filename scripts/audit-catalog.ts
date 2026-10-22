import { PrismaClient } from "@prisma/client";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";
import { catalogTargets } from "./catalog-expansion";
const db = new PrismaClient();
try {
  const products = await db.product.findMany({
    where: { enrichmentVersion: { gte: 1 } },
    include: {
      category: true,
      colors: {
        include: {
          images: { include: { mediaAsset: true } },
          outfits: {
            include: { items: { include: { color: true, product: true } } },
          },
        },
      },
      variants: true,
    },
  });
  if (new Set(products.map((p) => p.name)).size !== products.length)
    throw new Error("Duplicate design names");
  for (const p of products) {
    if (p.colors.length < 2 || p.colors.length > 5)
      throw new Error("Color count " + p.sku);
    if (
      !p.description ||
      !p.material ||
      !p.fit ||
      !p.price ||
      !p.publicationStatus
    )
      throw new Error("Missing product attributes " + p.sku);
    for (const c of p.colors) {
      if (!c.images.length) throw new Error("Missing gallery " + p.sku);
      for (const image of c.images) {
        if (!(await stat("public" + image.url)).isFile())
          throw new Error("Missing file " + image.url);
        if (!image.mediaAsset)
          throw new Error("Missing rights record " + image.url);
        if (
          image.mediaAsset.productId !== p.id ||
          image.mediaAsset.colorId !== c.id
        )
          throw new Error("Incorrect media association " + image.url);
        if (image.mediaAsset.role === "DEVELOPMENT") {
          if (
            image.mediaAsset.reviewStatus === "APPROVED" ||
            p.publicationStatus === "READY"
          )
            throw new Error("Unverified development asset published");
          if (
            image.url.endsWith(".svg") &&
            !(await readFile("public" + image.url, "utf8")).includes(c.hex)
          )
            throw new Error("Swatch/image mismatch " + image.url);
        } else if (!image.url.endsWith(".svg")) {
          const m = await sharp("public" + image.url).metadata();
          if (!m.width || !m.height)
            throw new Error("Invalid photo " + image.url);
        }
      }
      if (c.outfits.length < 2) throw new Error("Missing styling " + p.sku);
      for (const o of c.outfits)
        for (const i of o.items)
          if (i.color.productId !== i.productId || i.productId === p.id)
            throw new Error("Incorrect styling relationship");
    }
    for (const v of p.variants)
      if (
        !p.colors.some(
          (c) =>
            c.id === v.colorId && c.name === v.color && c.hex === v.colorHex,
        )
      )
        throw new Error("Orphan variant " + v.sku);
  }
  const counts = Object.fromEntries(
    Object.keys(catalogTargets).map((slug) => [
      slug,
      products.filter((p) => p.category.slug === slug).length,
    ]),
  );
  for (const [slug, total] of Object.entries(catalogTargets))
    if (counts[slug] !== total) throw new Error("Category count " + slug);
  const violations = await db.$queryRawUnsafe<any[]>(
    "PRAGMA foreign_key_check",
  );
  if (violations.length) throw new Error("Foreign key violation");
  console.log(
    JSON.stringify(
      {
        products: products.length,
        colors: products.reduce((n, p) => n + p.colors.length, 0),
        images: products.reduce(
          (n, p) => n + p.colors.reduce((m, c) => m + c.images.length, 0),
          0,
        ),
        outfits: products.reduce(
          (n, p) => n + p.colors.reduce((m, c) => m + c.outfits.length, 0),
          0,
        ),
        counts,
        variants: await db.productVariant.count(),
        pendingPhotography: products.filter(
          (p) => p.publicationStatus !== "READY",
        ).length,
        approvedEditorial: await db.mediaAsset.count({
          where: { role: "EDITORIAL", reviewStatus: "APPROVED" },
        }),
        approvedProductPhotos: await db.mediaAsset.count({
          where: { role: "PRODUCT", reviewStatus: "APPROVED" },
        }),
        foreignKeyViolations: violations,
      },
      null,
      2,
    ),
  );
} finally {
  await db.$disconnect();
}
