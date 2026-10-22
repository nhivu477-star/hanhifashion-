import { PrismaClient } from "@prisma/client";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { sizes, normalize } from "../src/lib/catalog";
const db = new PrismaClient();
const rows = JSON.parse(
  await readFile("scripts/data/office-photo-sources.json", "utf8"),
);
const palette: Record<string, [string, string]> = {
  Trắng: ["Trắng tinh", "#FAFAF8"],
  "Xanh dương nhạt": ["Xanh dương nhạt", "#BCD9E8"],
  "Kem 01": ["Kem nhạt", "#F2E8D8"],
  Đen: ["Đen thanh lịch", "#252525"],
  "Xanh navy": ["Xanh navy", "#263B55"],
  "Be khaki": ["Be khaki", "#BAB3A1"],
  "Da 01": ["Be cát", "#D2B79B"],
  "Xám 01": ["Xám ngọc trai", "#B9B9B7"],
  "Be melange": ["Nâu taupe", "#9C8A75"],
  "Lilac Pink": ["Hồng phấn", "#E1C6D8"],
};
const products = await db.product.findMany({
  where: { enrichmentVersion: { gte: 1 } },
  include: { images: true, category: true, colors: true },
  orderBy: { sku: "asc" },
});
const saved = await db.storeSetting.findUnique({
  where: { key: "demoDesignProducts" },
});
const designProducts: Record<string, string> = saved
  ? JSON.parse(saved.value)
  : {};
const oldAliases = await db.storeSetting.findUnique({
  where: { key: "productAliases" },
});
const aliases: Record<string, string> = oldAliases
  ? JSON.parse(oldAliases.value)
  : {};
const claimed = new Set<string>();
const colorModelPreviews: Record<string, any[]> = {};
for (const r of rows) {
  const candidates = products.filter(
    (p) => p.category.slug === r.category && !claimed.has(p.id),
  );
  const p =
    candidates.find((p) => p.id === designProducts[r.id]) ??
    candidates.find((p) =>
      p.images.some((i) => i.url.includes("/" + r.id + "-")),
    ) ??
    candidates[0];
  if (!p) throw new Error("No canonical record for " + r.id);
  designProducts[r.id] = p.id;
  claimed.add(p.id);
}
const oldToCanonical = new Map<string, string>();
for (const p of products) {
  const row =
    rows.find((r: any) =>
      p.images.some((i) => i.url.includes("/" + r.id + "-")),
    ) ??
    rows.find((r: any) => r.category === p.category.slug) ??
    rows.find((r: any) => r.id === "saint-argent");
  oldToCanonical.set(p.id, designProducts[row.id]);
  if (p.slug !== row.slug) aliases[p.slug] = row.slug;
}
for (const r of rows) {
  const p = products.find((p) => p.id === designProducts[r.id])!;
  oldToCanonical.set(p.id, p.id);
  if (p.slug !== r.slug) aliases[p.slug] = r.slug;
  delete aliases[r.slug];
}
await db.$transaction(
  async (tx) => {
    await tx.product.updateMany({
      where: { id: { in: products.map((p) => p.id) } },
      data: { active: false },
    });
    for (const r of rows) {
      const id = designProducts[r.id];
      const cat = await tx.category.findUniqueOrThrow({
        where: { slug: r.category },
      });
      const sub = await tx.category.findUniqueOrThrow({
        where: { slug: r.subcategory },
      });
      if (sub.parentId !== cat.id) throw new Error("Invalid taxonomy " + r.id);
      await tx.productColor.updateMany({
        where: { productId: id },
        data: { active: false },
      });
      await tx.productImage.deleteMany({ where: { productId: id } });
      for (const [position, c] of r.colors.entries()) {
        const [name, hex] = palette[c.sourceColor] ?? [];
        if (!name || !c.localDetailImages?.length)
          throw new Error(
            "Missing actual color/product photo " + r.id + " " + c.sourceColor,
          );
        const color = await tx.productColor.upsert({
          where: { productId_name: { productId: id, name } },
          update: { active: true, hex, position },
          create: { productId: id, name, hex, position, active: true },
        });
        await tx.productVariant.updateMany({
          where: { productId: id, colorId: color.id },
          data: { colorHex: hex, priceOverride: null },
        });
        const product = products.find((p) => p.id === id)!;
        for (const size of sizes)
          await tx.productVariant.upsert({
            where: {
              productId_size_color: { productId: id, size, color: name },
            },
            update: { colorId: color.id, colorHex: hex, priceOverride: null },
            create: {
              productId: id,
              colorId: color.id,
              size,
              color: name,
              colorHex: hex,
              sku: `${product.sku}-CURATED-${position}-${size}`,
              stock: 12,
              stockOrigin: "SAMPLE",
            },
          });
        await tx.colorImage.deleteMany({ where: { colorId: color.id } });
        async function media(path: string, source: string, kind: string) {
          return tx.mediaAsset.upsert({
            where: { localPath: path },
            update: {},
            create: {
              localPath: path,
              originalSourceUrl: source,
              creator: r.brand,
              licenseType: "UNKNOWN",
              licenseReference: source,
              authorizedUse: "LOCAL_REFERENCE_DEMO",
              role: "DEVELOPMENT",
              reviewStatus: "PENDING",
              garmentVerified: false,
              verificationNotes: `Source design ${r.id}; color ${c.sourceColor}; ${kind}. Local reference demo; commercial use not cleared.`,
            },
          });
        }
        for (const [i, path] of c.localDetailImages.entries()) {
          const asset = await media(
            path,
            c.sourceUrl ?? r.sourceUrl,
            "Photograph of garment alone",
          );
          await tx.colorImage.create({
            data: {
              colorId: color.id,
              url: path,
              alt: `${r.title} — ${name}`,
              position: i,
              mediaAssetId: asset.id,
            },
          });
        }
        colorModelPreviews[color.id] = [];
        for (const [i, path] of c.localImages.slice(0, 2).entries()) {
          const asset = await media(
            path,
            c.sourceUrl ?? r.sourceUrl,
            "Model photograph for listing only",
          );
          colorModelPreviews[color.id].push({
            id: color.id + "-model-" + i,
            productId: id,
            url: path,
            alt: `${r.title} — ${name}`,
            position: i,
            mediaAssetId: asset.id,
          });
        }
        if (position === 0)
          for (const [i, path] of c.localImages.slice(0, 2).entries()) {
            const asset = await media(
              path,
              c.sourceUrl ?? r.sourceUrl,
              "Model photograph for listing only",
            );
            await tx.productImage.create({
              data: {
                productId: id,
                url: path,
                alt: `${r.title} — ${name}`,
                position: i,
                mediaAssetId: asset.id,
              },
            });
          }
      }
      await tx.product.update({
        where: { id },
        data: {
          active: true,
          slug: r.slug,
          name: r.title,
          price: r.price,
          salePrice: null,
          categoryId: cat.id,
          subcategoryId: sub.id,
          material: r.material,
          fit: r.fit,
          fitClass: r.fit === "Slim Fit" ? "slim" : "regular",
          sleeveType: r.sleeveType,
          style: "Thanh lịch",
          styleTags: r.title,
          length: /dam|chan-vay/.test(r.category) ? "Midi" : "Theo thiết kế",
          description: r.description,
          details: r.description,
          care: "Đối chiếu nhãn chăm sóc của sản phẩm trước khi giặt.",
          styling: "Phối cùng các thiết kế trơn màu cho tủ đồ công sở.",
          occasion: "Daily Office",
          featured: true,
          isNew: true,
          publicationStatus: "PENDING_ASSETS",
          merchandiseVerified: false,
          searchText: normalize(
            [
              r.title,
              r.description,
              cat.name,
              sub.name,
              r.material,
              ...r.colors.map((c: any) => palette[c.sourceColor][0]),
            ].join(" "),
          ),
        },
      });
    }
    // Transfer saved favorites to the one canonical product; historical order/stock records stay intact.
    for (const item of await tx.wishlistItem.findMany({
      where: {
        productId: {
          in: products.filter((p) => !claimed.has(p.id)).map((p) => p.id),
        },
      },
    })) {
      const productId = oldToCanonical.get(item.productId)!;
      await tx.wishlistItem.upsert({
        where: {
          wishlistId_productId: { wishlistId: item.wishlistId, productId },
        },
        update: {},
        create: { wishlistId: item.wishlistId, productId },
      });
      await tx.wishlistItem.delete({ where: { id: item.id } });
    }
    for (const c of await tx.collection.findMany()) {
      await tx.collectionProduct.deleteMany({
        where: {
          collectionId: c.id,
          productId: { in: products.map((p) => p.id) },
        },
      });
      const selected = rows.filter((r: any) =>
        /powder-blue/.test(c.slug)
          ? r.colors.some((x: any) => x.sourceColor === "Xanh dương nhạt")
          : /soft-elegance|feminine/.test(c.slug)
            ? /ao-kieu|chan-vay|dam|len/.test(r.category)
            : true,
      );
      for (const r of selected)
        await tx.collectionProduct.create({
          data: { collectionId: c.id, productId: designProducts[r.id] },
        });
      if (selected.length)
        await tx.collection.update({
          where: { id: c.id },
          data: { image: selected[0].colors[0].localImages[0] },
        });
    }
    for (const key of [
      "demoDesignProducts",
      "productAliases",
      "catalogMode",
      "colorModelPreviews",
    ]) {
      const value =
        key === "catalogMode"
          ? "curated"
          : JSON.stringify(
              key === "demoDesignProducts"
                ? designProducts
                : key === "colorModelPreviews"
                  ? colorModelPreviews
                  : aliases,
            );
      await tx.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    for (const r of rows)
      await tx.category.update({
        where: { slug: r.category },
        data: { image: r.colors[0].localImages[0] },
      });
  },
  { timeout: 60000 },
);
await mkdir("verification", { recursive: true });
const report = {
  canonicalProducts: rows.length,
  archivedDuplicates: products.length - rows.length,
  colorways: rows.reduce((n: number, r: any) => n + r.colors.length, 0),
  designProducts,
  aliases,
  products: rows.map((r: any) => ({
    design: r.id,
    slug: r.slug,
    name: r.title,
    price: r.price,
    category: r.category,
    subcategory: r.subcategory,
    colors: r.colors.map((c: any) => palette[c.sourceColor][0]),
  })),
};
await writeFile(
  "verification/catalog-consistency.json",
  JSON.stringify(report, null, 2),
);
await writeFile(
  "public/images/office-demo/sources.json",
  JSON.stringify(rows, null, 2),
);
console.log(
  JSON.stringify({
    canonicalProducts: report.canonicalProducts,
    archivedDuplicates: report.archivedDuplicates,
    colorways: report.colorways,
  }),
);
await db.$disconnect();
