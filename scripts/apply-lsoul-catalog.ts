import { nextProductSku, productSkuPrefix } from "../src/lib/product-sku";
import { PrismaClient } from "@prisma/client";
import { readFile, access, writeFile } from "node:fs/promises";
import { normalize } from "../src/lib/catalog";
const db = new PrismaClient();
const manifest = JSON.parse(
  await readFile("scripts/data/lsoul-manifest.json", "utf8"),
);
for (const r of manifest.designs)
  for (const c of r.colors)
    for (const path of c.localImages) await access("public" + path);
const latestNames = [
  "Ricci Dress",
  "Joye Bodysuit",
  "Tya Dress",
  "Liery Dress",
  "Desii Dress",
  "Erros Top",
  "Aslur Dress",
  "Liu Top",
  "Awak Jacket",
  "Ers Jeans",
  "Neece Dress",
];
const categoryLabels: Record<string, string> = {
  "trang-phuc": "Trang phục",
  ao: "Áo",
  dam: "Đầm",
  "quan-vay": "Quần & chân váy",
  "bo-trang-phuc": "Bộ trang phục",
  giay: "Giày",
  "tui-xach": "Túi xách",
  "phu-kien": "Phụ kiện",
};
const modelPreviews: Record<string, unknown[]> = {};
const existingPreview = await db.storeSetting.findUnique({
  where: { key: "colorModelPreviews" },
});
if (existingPreview)
  Object.assign(modelPreviews, JSON.parse(existingPreview.value));
await db.$transaction(
  async (tx) => {
    await tx.category.updateMany({ data: { active: false } });
    const cats: Record<string, string> = {};
    for (const [i, slug] of Object.keys(categoryLabels).entries()) {
      const parentId = ["ao", "dam", "quan-vay", "bo-trang-phuc"].includes(slug)
        ? cats["trang-phuc"]
        : null;
      const r = manifest.designs.find(
        (r: any) =>
          r.category === slug ||
          (slug === "trang-phuc" &&
            ["ao", "dam", "quan-vay", "bo-trang-phuc"].includes(r.category)),
      );
      const data = {
        name: categoryLabels[slug],
        description: `Khám phá ${categoryLabels[slug].toLowerCase()} và những thiết kế mới.`,
        active: true,
        parentId,
        sortOrder: i,
        image:
          r?.colors[0].localImages[0] ?? "/images/lsoul/banner-awak-1.webp",
      };
      const c = await tx.category.upsert({
        where: { slug },
        update: data,
        create: { slug, ...data },
      });
      cats[slug] = c.id;
    }
    await tx.product.updateMany({
      where: { active: true },
      data: { active: false },
    });
    const collectionIds: Record<string, string> = {};
    for (const [slug, name, description] of [
      ["new-season", "Mùa mới", "Những thiết kế mới nhất."],
      ["statement", "Dấu ấn cá tính", "Đầm và trang phục phối bộ."],
      ["essentials", "Thiết kế hằng ngày", "Áo, denim, giày, túi và phụ kiện."],
    ]) {
      const col = await tx.collection.upsert({
        where: { slug },
        update: { name, description },
        create: { slug, name, description, image: "" },
      });
      collectionIds[slug] = col.id;
      await tx.collectionProduct.deleteMany({
        where: { collectionId: col.id },
      });
    }
    for (const [index, r] of manifest.designs.entries()) {
      const clothing = ["ao", "dam", "quan-vay", "bo-trang-phuc"].includes(
        r.category,
      );
      const data = {
        name: r.title,
        description: r.description,
        details: r.sourceDescription?.trim().replace(/^Description\s*/i, "").replace(/\s*(Product materials:|Model is )/g, "\n\n$1") || r.description,
        material: r.material,
        style: "Thời trang nữ",
        fit: r.fit,
        occasion: "Theo phong cách cá nhân",
        price: r.price,
        salePrice: null,
        active: true,
        featured: true,
        isNew: latestNames.includes(r.sourceName),
        searchText: normalize(
          [
            r.title,
            r.sourceName,
            r.description,
            r.material,
            ...r.colors.map((c: any) => c.name),
          ].join(" "),
        ),
        categoryId: cats[clothing ? "trang-phuc" : r.category],
        subcategoryId: clothing ? cats[r.category] : null,
        sleeveType: r.sleeveType,
        length: "Theo thiết kế",
        styleTags: "",
        care: "Đối chiếu nhãn chăm sóc của sản phẩm trước khi vệ sinh.",
        styling: "Kết hợp cùng giày, túi và phụ kiện theo phong cách riêng.",
        fitClass: "unknown",
        stretchVerified: false,
        enrichmentVersion: 3,
        publicationStatus: "PENDING_ASSETS",
        merchandiseVerified: false,
      };
      const p = await tx.product.upsert({
        where: { slug: r.slug },
        update: data,
        create: {
          slug: r.slug,
          sku: nextProductSku(productSkuPrefix(r.category), await tx.product.findMany({ select: { sku: true } })),
          ...data,
        },
      });
      await tx.productImage.deleteMany({ where: { productId: p.id } });
      await tx.productColor.updateMany({
        where: { productId: p.id },
        data: { active: false },
      });
      for (const [position, c] of r.colors.entries()) {
        const color = await tx.productColor.upsert({
          where: { productId_name: { productId: p.id, name: c.name } },
          update: { active: true, hex: c.hex, position },
          create: { productId: p.id, name: c.name, hex: c.hex, position },
        });
        await tx.colorImage.deleteMany({ where: { colorId: color.id } });
        modelPreviews[color.id] = [];
        for (const [i, path] of c.localImages.entries()) {
          const m = await tx.mediaAsset.upsert({
            where: { localPath: path },
            update: {},
            create: {
              localPath: path,
              originalSourceUrl: c.images[i],
              creator: "LSOUL",
              licenseType: "REFERENCE_ONLY",
              licenseReference: c.sourceUrl,
              authorizedUse: "LOCAL_REFERENCE_DEMO",
              role: "DEVELOPMENT",
              reviewStatus: "PENDING",
              productId: p.id,
              verificationNotes: `Original LSOUL source photograph. Design: ${r.sourceName}; colour: ${c.sourceColor}. No recolouring. Source page price ${c.sourcePrice} VND; shared demo design price ${r.price} VND. Commercial clearance pending.`,
            },
          });
          const img = {
            url: path,
            alt: r.title + " — " + c.name,
            position: i,
            mediaAssetId: m.id,
          };
          await tx.colorImage.create({ data: { colorId: color.id, ...img } });
          modelPreviews[color.id].push({
            id: color.id + "-preview-" + i,
            productId: p.id,
            ...img,
          });
          if (position === 0 && i < 2)
            await tx.productImage.create({ data: { productId: p.id, ...img } });
        }
        for (const [si, size] of c.sizes.entries())
          await tx.productVariant.upsert({
            where: {
              productId_size_color: { productId: p.id, size, color: c.name },
            },
            update: {
              colorId: color.id,
              colorHex: c.hex,
              priceOverride: null,
              stock: c.available ? 12 : 0,
              stockOrigin: "SAMPLE",
            },
            create: {
              productId: p.id,
              colorId: color.id,
              color: c.name,
              colorHex: c.hex,
              size,
              sku: `${p.sku}-${position}-${si}`,
              stock: c.available ? 12 : 0,
              stockOrigin: "SAMPLE",
            },
          });
      }
      const group = data.isNew
        ? "new-season"
        : ["dam", "bo-trang-phuc"].includes(r.category)
          ? "statement"
          : "essentials";
      await tx.collectionProduct.create({
        data: { collectionId: collectionIds[group], productId: p.id },
      });
      if (index % 30 === 0)
        console.log(`Applied ${index}/${manifest.designs.length}`);
    }
    for (const [slug, id] of Object.entries(collectionIds)) {
      const first = await tx.collectionProduct.findFirst({
        where: { collectionId: id },
        include: { product: { include: { images: { take: 1 } } } },
      });
      if (first)
        await tx.collection.update({
          where: { slug },
          data: { image: first.product.images[0].url },
        });
    }
    const settings = {
      catalogMode: "lsoul-reference",
      colorModelPreviews: JSON.stringify(modelPreviews),
      brandStory:
        "HÀ NHI FASHION — thời trang nữ, giày, túi và phụ kiện dành cho phong cách riêng của nàng.",
      announcement: "KHÁM PHÁ THIẾT KẾ MỚI CÙNG HÀ NHI",
      newsletter: "Khám phá thiết kế và những cảm hứng mới từ HÀ NHI.",
    };
    for (const [key, value] of Object.entries(settings))
      await tx.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
  },
  { timeout: 120000 },
);
await writeFile(
  "verification/lsoul-import-report.json",
  JSON.stringify(
    {
      sourceListings: manifest.sourceListings,
      designs: manifest.designs.length,
      colors: manifest.designs.reduce(
        (n: number, r: any) => n + r.colors.length,
        0,
      ),
      categories: categoryLabels,
      source: "https://lsoul.com/vn/",
      date: new Date().toISOString(),
    },
    null,
    2,
  ),
);
await db.$disconnect();
console.log("Imported LSOUL reference catalog");
