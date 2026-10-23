import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { writeFile, mkdir, access } from "node:fs/promises";
// Individually selected source pages and their applicable Pexels license were reviewed.
const sources = [
  {
    id: "9218536",
    slug: "a-blazer-hanging-on-a-clothes-hanger",
    creator: "PNW Production",
    name: "editorial-blazer",
    collections: [
      "soft-elegance",
      "neutral-essentials",
      "feminine-silhouettes",
      "timeless-workwear",
    ],
  },
  {
    id: "11829573",
    slug: "brown-blazer-hanging-on-a-door",
    creator: "Chantal Lenting",
    name: "editorial-wardrobe",
    collections: [
      "spring-office",
      "elegant-meetings",
      "powder-blue-collection",
    ],
  },
];
export async function importEditorial(db: PrismaClient) {
  await mkdir("public/images", { recursive: true });
  for (const s of sources) {
    const path = "/images/" + s.name + ".webp";
    try {
      await access("public" + path);
    } catch {
      const r = await fetch(
        `https://images.pexels.com/photos/${s.id}/pexels-photo-${s.id}.jpeg?auto=compress&w=1600`,
      );
      if (!r.ok) throw new Error(`Image download ${s.id}: ${r.status}`);
      const optimized = await sharp(Buffer.from(await r.arrayBuffer()))
        .rotate()
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer();
      await writeFile("public" + path, optimized);
    }
    await db.mediaAsset.upsert({
      where: { localPath: path },
      update: {},
      create: {
        localPath: path,
        originalSourceUrl: `https://www.pexels.com/photo/${s.slug}-${s.id}/`,
        creator: s.creator,
        licenseType: "Pexels License",
        licenseReference: "https://www.pexels.com/legal-pages/license/",
        authorizedUse: "EDITORIAL_CAMPAIGN",
        role: "EDITORIAL",
        reviewStatus: "APPROVED",
        reviewedAt: new Date(),
        verificationNotes:
          "Reviewed source and Pexels license on 2026-10-17. No identifiable model, visible ownership watermark or endorsement claim. Approved only for editorial collection imagery. Not evidence of HÀ NHI merchandise; never associate with a sellable SKU.",
      },
    });
    await db.collection.updateMany({
      where: {
        slug: { in: s.collections },
        image: { in: ["/images/editorial-blazer.webp", ""] },
      },
      data: { image: path },
    });
    console.log("Imported editorial asset:", path);
  }
}
if (process.argv[1]?.endsWith("import-editorial.ts")) {
  const db = new PrismaClient();
  await importEditorial(db).finally(() => db.$disconnect());
}
