import { supplementColors } from "./supplement-colors";
import { importEditorial } from "./import-editorial";
import { PrismaClient } from "@prisma/client";
import { enrichCatalog, rebuildSampleAssets } from "./enrich-catalog";
import { catalogTargets } from "./catalog-expansion";
import { refreshSearch } from "../src/lib/search";
export async function upgradeCatalog(db: PrismaClient) {
  const mode = (
    await db.storeSetting.findUnique({ where: { key: "catalogMode" } })
  )?.value;
  if (mode && ["curated", "lsoul-reference"].includes(mode)) {
    console.log(
      "Curated source catalog preserved; automatic demo expansion skipped.",
    );
    return;
  }
  const before = await db.product.count();
  await enrichCatalog(db);
  await supplementColors(db);
  await enrichCatalog(db);
  await rebuildSampleAssets(db);
  const products = await db.product.findMany({
    where: { enrichmentVersion: { gte: 1 } },
    include: {
      category: true,
      colors: { include: { images: true, variants: true } },
    },
  });
  const collections = [
    {
      name: "Modern Office",
      slug: "modern-office",
      description: "Những đường cắt gọn gàng cho nhịp làm việc hiện đại.",
      match: (p: any) =>
        /ao-so-mi|quan-tay|ao-vest-blazer|set-cong-so/.test(p.category.slug),
    },
    {
      name: "Soft Elegance",
      slug: "soft-elegance",
      description: "Phom mềm, sắc dịu và chất liệu rủ nhẹ.",
      match: (p: any) => /Satin|Chiffon|Silk|Viscose/.test(p.material),
    },
    {
      name: "Powder Blue Collection",
      slug: "powder-blue-collection",
      description: "Những thiết kế mang sắc xanh dịu cho ngày mới.",
      match: (p: any) =>
        p.colors.some((c: any) =>
          /Xanh dương nhạt|Xanh baby|Xanh pastel/.test(c.name),
        ),
    },
    {
      name: "Neutral Essentials",
      slug: "neutral-essentials",
      description: "Trang phục nền tảng với be, kem, xám và nâu taupe.",
      match: (p: any) =>
        p.colors.some((c: any) => /Be |Kem |Trắng ngà|Xám|taupe/.test(c.name)),
    },
    {
      name: "Spring Office",
      slug: "spring-office",
      description: "Linen, tay lỡ và những lớp áo nhẹ cho mùa chuyển tiết.",
      match: (p: any) =>
        p.material === "Linen" || /tay lỡ|tay ngắn|cardigan/.test(p.name),
    },
    {
      name: "Elegant Meetings",
      slug: "elegant-meetings",
      description: "Blazer, quần âu và đầm chỉn chu cho cuộc họp.",
      match: (p: any) =>
        /ao-vest-blazer|set-cong-so/.test(p.category.slug) ||
        /vest|bút chì/.test(p.name),
    },
    {
      name: "Feminine Silhouettes",
      slug: "feminine-silhouettes",
      description: "Đường chiết eo, nếp ly và phom chữ A nhẹ nhàng.",
      match: (p: any) => /peplum|chiết eo|chữ A|xếp ly|cổ nơ/.test(p.name),
    },
    {
      name: "Timeless Workwear",
      slug: "timeless-workwear",
      description: "Những phom công sở có thể phối lại qua nhiều mùa.",
      match: (p: any) => /cổ đức|ống đứng|bút chì|cổ ve/.test(p.name),
    },
  ];
  for (const c of collections) {
    const row = await db.collection.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: "/images/editorial-blazer.webp",
      },
    });
    for (const p of products.filter(c.match))
      await db.collectionProduct.upsert({
        where: {
          collectionId_productId: { collectionId: row.id, productId: p.id },
        },
        update: {},
        create: { collectionId: row.id, productId: p.id },
      });
  }
  const threePiece = await db.product.findFirst({
    where: { name: "Set blazer gile và quần ống rộng", enrichmentVersion: 1 },
  });
  if (threePiece)
    await db.product.update({
      where: { id: threePiece.id },
      data: {
        details: threePiece.details.replace(
          "Bộ gồm blazer gile và quần ống rộng.",
          "Bộ gồm 1 blazer, 1 gile và 1 quần ống rộng.",
        ),
        styleTags: threePiece.styleTags.includes("bộ ba món")
          ? threePiece.styleTags
          : threePiece.styleTags + " · bộ ba món",
      },
    });
  await importEditorial(db);
  for (const name of ["hero", "blouse", "blazer", "skirt", "dress"]) {
    const localPath = "/images/" + name + ".png";
    await db.mediaAsset.upsert({
      where: { localPath },
      update: {},
      create: {
        localPath,
        originalSourceUrl: "local://legacy-assets/" + name,
        licenseType: "UNKNOWN",
        licenseReference: "Cần bổ sung hồ sơ nguồn từ dự án trước",
        authorizedUse: "LOCAL_PREVIEW_ONLY",
        role: "DEVELOPMENT",
        reviewStatus: "PENDING",
        verificationNotes:
          "Tệp có sẵn trước đợt nâng cấp; chưa xác nhận nguồn gốc, quyền thương mại hoặc quyền hình ảnh. Giữ riêng để rà soát, không duyệt làm ảnh hàng thật.",
      },
    });
  }
  for (const p of products)
    for (const c of p.colors)
      for (const image of c.images) {
        const asset = await db.mediaAsset.upsert({
          where: { localPath: image.url },
          update: {},
          create: {
            localPath: image.url,
            originalSourceUrl: "local://catalog-development/" + p.sku,
            creator: "HÀ NHI local catalog generator",
            licenseType: "LOCAL_DEVELOPMENT",
            licenseReference: "PROJECT_SPEC.md",
            authorizedUse: "LOCAL_PREVIEW_ONLY",
            role: "DEVELOPMENT",
            reviewStatus: "DEVELOPMENT",
            verificationNotes:
              "Bản dựng nội bộ theo cấu hình mẫu, chưa có xác minh hàng hóa hoặc ảnh chụp thương mại.",
            productId: p.id,
            colorId: c.id,
          },
        });
        await db.colorImage.update({
          where: { id: image.id },
          data: { mediaAssetId: asset.id },
        });
        await db.productImage.updateMany({
          where: { productId: p.id, url: image.url },
          data: { mediaAssetId: asset.id },
        });
      }
  await refreshSearch();
  const counts: Record<string, number> = {};
  for (const p of products)
    counts[p.category.slug] = (counts[p.category.slug] ?? 0) + 1;
  for (const [slug, n] of Object.entries(catalogTargets))
    if (counts[slug] !== n)
      throw new Error(`Unexpected count ${slug}: ${counts[slug]} / ${n}`);
  console.log(
    JSON.stringify(
      {
        before,
        after: products.length,
        added: products.length - before,
        colors: products.reduce((n, p) => n + p.colors.length, 0),
        counts,
      },
      null,
      2,
    ),
  );
}
if (process.argv[1]?.endsWith("upgrade-catalog.ts")) {
  const db = new PrismaClient();
  await upgradeCatalog(db).finally(() => db.$disconnect());
}
